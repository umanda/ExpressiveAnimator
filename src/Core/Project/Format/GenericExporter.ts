/*
 * Copyright 2021 Zindex Software
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type {Element, Exporter} from "@zindex/canvas-engine";
import {
    Brush,
    EmptyBrush,
    equals,
    GradientBrush,
    HandleType,
    PathNode,
    Point,
    SolidBrush,
    VectorElement,
    WritableKeys,
} from "@zindex/canvas-engine";
import type {AnimationProject} from "../AnimationProject";
import type {AnimationDocument} from "../AnimationDocument";
import type {Animation, DocumentAnimationMap} from "../../Animation";
import {
    BrushAnimation,
    CubicEasing,
    CubicLinear,
    Keyframe,
    LinearEasing,
    MotionAnimation,
    OpacityAnimation,
    PointAnimation,
    PositiveNumberAnimation,
    StepEndEasing,
    StepsEasing,
    StepStartEasing,
} from "../../Animation";

type KeyframeEasingHandlerFunc<T> = (animation: Animation<T>, from: Keyframe<T>, to: Keyframe<T>, linearReplacement: CubicEasing, offsetDelta: number) => void;
type KeyframeEasingHandler<T> = {
    stepStart: KeyframeEasingHandlerFunc<T>,
    stepEnd: KeyframeEasingHandlerFunc<T>,
    steps: KeyframeEasingHandlerFunc<T>,
    cubic: KeyframeEasingHandlerFunc<T>,
    last: (animation: Animation<T>, last: Keyframe<T>) => void,
}

export abstract class GenericExporter implements Exporter<AnimationProject> {
    abstract export(project: AnimationProject): Promise<ReadableStream>;

    protected animationMap: DocumentAnimationMap = null;
    protected currentDocument: AnimationDocument = null;
    protected fitAnimations: Map<Animation<any>, Animation<any> | null> = new Map<Animation<any>, Animation<any> | null>();

    protected fps: number = 30;

    protected startTime: number = 0;
    protected endTime: number = 0;

    protected get startFrame(): number {
        return this.frameTime(this.startTime);
    }

    protected get endFrame(): number {
        return this.frameTime(this.startTime);
    }

    protected frameTime(time: number): number {
        return this.fps * time / 1000;
    }

    protected setCurrentDocument(document: AnimationDocument): void {
        this.fitAnimations.clear();
        this.currentDocument = document;
        this.animationMap = document.animation;
        // TODO: set from animation
        this.fps = 30;

        this.startTime = this.animationMap.startTime;
        this.endTime = this.animationMap.endTime;
    }

    dispose() {
        this.fitAnimations.clear();
        this.currentDocument = null;
        this.animationMap = null;
        this.fitAnimations = null;
    }

    /**
     * Returns the animation cut for the element or null if not present / disabled / no keyframes / not in play range
     */
    protected getAnimation<E extends Element, P extends  WritableKeys<E>>(element: E, property: P): Animation<E[P]> | null {
        const animation = this.animationMap?.getAnimation(element, property);
        if (animation == null) {
            return null;
        }

        if (this.fitAnimations.has(animation)) {
            return this.fitAnimations.get(animation);
        }

        if (animation.disabled || animation.keyframes.length === 0 || this.startTime >= this.endTime) {
            this.fitAnimations.set(animation, null);
            return null;
        }

        let fitted = animation.fit(this.startTime, this.endTime, 1, true);
        if (fitted != null && fitted.keyframes.length > 0) {
            if (fitted === animation) {
                fitted = fitted.clone();
            }
            fitted = this.handleAnimationEasing(fitted);
        }

        return this.fitAnimations
            .set(animation, fitted)
            .get(animation);
    }

    protected abstract handleAnimationEasing<T>(animation: Animation<T>): Animation<T>;

    /**
     * Checks if the global element opacity is > 0
     */
    protected isElementCompositionVisible(element: Element): boolean {
        const opacity = this.getAnimation(element, "opacity") as OpacityAnimation;

        if (opacity) {
            return opacity.isVisible;
        }

        return element.opacity > 0;
    }

    /**
     * Checks if the scaled element is visible
     */
    protected isScaledElementVisible(element: Element): boolean {
        const scale = this.getAnimation(element, "scale") as PointAnimation;
        if (!scale) {
            return element.scale.x !== 0 && element.scale.y !== 0;
        }

        let x: boolean = false;
        let y: boolean = false;

        for (const kf of scale.keyframes) {
            if (kf.value.x !== 0) {
                x = true;
            }
            if (kf.value.y !== 0) {
                y = true;
            }
        }

        return x && y;
    }

    /**
     * Checks if the element is scaled
     */
    protected isElementScaled(element: Element): boolean {
        const scale = this.getAnimation(element, "scale") as PointAnimation;
        if (scale) {
            return !this.sameKeyframeValue(scale.keyframes, Point.UNIT);
        }

        return element.scale.x !== 1 || element.scale.y !== 1;
    }

    /**
     * Checks if the fill paint is visible
     */
    protected isFillPaintVisible(element: VectorElement): boolean {
        const opacity = this.getAnimation(element, "fillOpacity") as OpacityAnimation;
        if ((opacity != null && !opacity.isVisible) || element.fillOpacity <= 0) {
            return false;
        }

        const brush = this.getAnimation(element, "fill") as BrushAnimation;
        if (brush) {
            return brush.isVisible;
        }

        return element.fill.isVisible;
    }

    /**
     * Checks if the stroke paint is visible
     */
    protected isStrokePaintVisible(element: VectorElement): boolean {
        const opacity = this.getAnimation(element, "strokeOpacity") as OpacityAnimation;
        if ((opacity != null && !opacity.isVisible) || element.strokeOpacity <= 0) {
            return false;
        }

        const brush = this.getAnimation(element, "strokeBrush") as BrushAnimation;
        if (brush) {
            return brush.isVisible;
        }

        return element.strokeBrush.isVisible;
    }

    /**
     * Checks if stroke line width is visible
     */
    protected isStrokeLineVisible(element: VectorElement): boolean {
        const width = this.getAnimation(element, "strokeLineWidth") as PositiveNumberAnimation;
        if (width) {
            return !width.isZero;
        }
        return element.strokeLineWidth > 0;
    }

    /**
     * Checks if stroke is visible
     */
    protected isStrokeVisible(element: VectorElement): boolean {
        return this.isStrokeLineVisible(element) && this.isStrokePaintVisible(element);
    }

    /**
     * Splits brush keyframes into animatable slices
     */
    protected splitBrushKeyframes(keyframes: Keyframe<Brush>[]): Keyframe<Brush>[][] {
        const length = keyframes.length;

        if (length < 2) {
            return [keyframes];
        }

        // create a copy of keyframes array
        keyframes = keyframes.slice();

        const gradientIndexes: number[] = [];
        const solidIndexes: number[] = [];

        let sameGradientType: boolean = true;
        let sameStopLength: boolean = true;
        let gradientType = null;
        let stopLength: number = null;
        let maxStopLength: number = 0;

        // find gradient & solid indexes, empty are converted to solid transparent
        for (let i = 0; i < length; i++) {
            if (keyframes[i].value instanceof EmptyBrush) {
                // Convert empty to solid
                keyframes[i] = keyframes[i].withValue(SolidBrush.TRANSPARENT);
                solidIndexes.push(i);
                continue;
            }

            if (keyframes[i].value instanceof SolidBrush) {
                solidIndexes.push(i);
                continue;
            }

            if (keyframes[i].value instanceof GradientBrush) {
                gradientIndexes.push(i);

                const gradient = keyframes[i].value as GradientBrush;

                if (gradient.stopColors.length > maxStopLength) {
                    maxStopLength = gradient.stopColors.length;
                }

                if (gradientType == null) {
                    gradientType = gradient.type;
                    stopLength = gradient.stopColors.length;
                    continue;
                }

                if (sameGradientType && gradientType !== gradient.type) {
                    sameGradientType = false;
                }
                if (sameStopLength && (stopLength !== gradient.stopColors.length)) {
                    sameStopLength = false;
                }
            }
        }

        // we don't have gradients
        if (gradientIndexes.length === 0) {
            // we assume all are solid (empty were converted above)
            return [keyframes];
        }

        // we have gradients

        if (sameGradientType) {
            // all gradients have the same type
            if (sameStopLength && solidIndexes.length === 0) {
                // all have the same stop length and there are no solids
                return [keyframes];
            }

            // we just need to add the missing stop colors
            return [this.expandGradientKeyframeList(keyframes as any, maxStopLength)];
        }

        // some gradients have different type
        // get chunks

        const list: Keyframe<Brush>[][] = [];
        const chunk: Keyframe<Brush>[] = [];

        const handleChunk = () => {
            if (chunk.length === 0) {
                return;
            }

            const keyframes = chunk.splice(0);
            let max = 0;
            for (const kf of keyframes) {
                if (kf.value instanceof GradientBrush) {
                    max = Math.max(max, kf.value.stopColors.length);
                }
            }
            list.push(this.expandGradientKeyframeList(keyframes as any, max));
        }

        gradientType = null;
        maxStopLength = 0;
        for (let i = 0; i < length; i++) {
            if (!(keyframes[i].value instanceof GradientBrush)) {
                // just add solids
                chunk.push(keyframes[i]);
                continue;
            }

            const gradient = keyframes[i].value as GradientBrush;
            if (gradientType == null || gradientType === gradient.type) {
                // same type or first gradient
                gradientType = gradient.type;
                maxStopLength = Math.max(maxStopLength, gradient.stopColors.length);
                chunk.push(keyframes[i]);
                continue;
            }

            // different types
            this.expandGradientKeyframeList(chunk as any, maxStopLength);

            // interpolate from to current
            const from = chunk[chunk.length - 1];
            const to = keyframes[i];
            const middle = (from.offset + to.offset) / 2;

            let split: boolean = false;
            let addHoldToNext: boolean = false;

            const easing = from.easing;
            if (easing instanceof StepEndEasing) {
                // hold, just add the same value
                chunk.push(from.withOffset(to.offset, true));
            } else if ((easing instanceof StepStartEasing)) {
                // it is a step-start, add hold to next
                addHoldToNext = true;
            } else {
                // we have to split
                split = true;
                // TODO: handle steps easing
            }

            if (split) {
                // Here stop lengths might be different
                // how to solve this?
                // and an intermediary chunk?
                if (maxStopLength !== gradient.stopColors.length) {

                } else {
                    // TODO: finish here
                }
            } else {
                // add the new chunk
                list.push(chunk.splice(0));
                // check if we need a hold
                if (addHoldToNext) {
                    chunk.push(new Keyframe<Brush>(to.value, from.offset, StepEndEasing.INSTANCE));
                }
            }

            // Add current to chunk
            chunk.push(to);
            // Set new gradient info
            maxStopLength = gradient.stopColors.length;
            gradientType = gradient.type;
        }

        if (chunk.length > 0) {
            // add last chunk
            list.push(this.expandGradientKeyframeList(keyframes as any, maxStopLength));
        }

        return list;
    }

    private expandGradientKeyframeList(keyframes: Keyframe<GradientBrush | SolidBrush>[], stopColorLength: number): Keyframe<GradientBrush>[] {
        // find the first stopColorLength reference index
        const index = keyframes.findIndex((k: Keyframe<GradientBrush>) => k.value.stopColors.length === stopColorLength);

        if (index === -1) {
            // this should never happen
            return keyframes as any;
        }

        // go backward
        for (let i = index - 1; i >= 0; i--) {
            keyframes[i] = this.expandGradientKeyframe(keyframes[i], keyframes[i + 1] as any);
        }

        // go forward
        for (let i = index + 1, length = keyframes.length; i < length; i++) {
            keyframes[i] = this.expandGradientKeyframe(keyframes[i], keyframes[i - 1] as any);
        }

        return keyframes as any;
    }

    private expandGradientKeyframe(keyframe: Keyframe<GradientBrush | SolidBrush>, reference: Keyframe<GradientBrush>): Keyframe<GradientBrush> {
        if (keyframe.value instanceof SolidBrush) {
            // convert solid to Gradient
            const gradient = reference.value.withStopColorList(reference.value.stopColors.allWithColor(keyframe.value.color));
            return keyframe.withValue(gradient) as any;
        }

        const gradient = keyframe.value as GradientBrush;
        if (gradient.stopColors.length >= reference.value.stopColors.length) {
            return keyframe as Keyframe<GradientBrush>;
        }

        return keyframe.withValue(gradient.withStopColorList(gradient.stopColors.expand(reference.value.stopColors))) as Keyframe<GradientBrush>;
    }

    /**
     * Checks if the motion path is used
     */
    protected isMotionPathUsed(element: Element): boolean {
        const motion = (this.getAnimation(element, "position") as any) as MotionAnimation;
        if (motion == null || motion.keyframes.length === 1) {
            return false;
        }

        const value = motion.keyframes[0].value.point;

        for (let i = 1, len = motion.keyframes.length; i < len; i++) {
            if (!value.equals(motion.keyframes[i].value.point)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Gets the value and the animation
     * If the animation has the same value on all keyframes,
     * value wil be the value of keyframe, and animation will be null
     * If there is no animation, the value will be the value stored on element
     */
    getProperty<E extends Element, P extends WritableKeys<E>>(element: E, property: P): {value: E[P], animation: Animation<E[P]> | null} {
        let animation = this.getAnimation(element, property);
        if (animation == null || animation.keyframes.length === 0) {
            return {value: element[property], animation: null};
        }
        return {
            value: animation.keyframes[0].value,
            animation: (animation.keyframes.length === 1 || this.sameKeyframeValue(animation.keyframes)) ? null : animation,
        };
    }

    /**
     * Checks if all the keyframes has the same value
     */
    protected sameKeyframeValue<T>(keyframes: Keyframe<T>[], value?: T): boolean {
        if (keyframes.length === 1) {
            return value == null ? true : equals(value, keyframes[0].value);
        }

        let i: number = 0;
        if (value == null) {
            value = keyframes[0].value;
            i = 1;
        }

        for (let len = keyframes.length; i < len; i++) {
            if (!equals(value, keyframes[i].value)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Checks if animation has steps easing
     */
    protected keyframesContainStepEasing<T>(keyframes: Keyframe<T>[], includeStepEnd: boolean = true): boolean {
        for (const kf of keyframes) {
            if (kf.easing == null) {
                continue;
            }
            if ((kf.easing instanceof StepStartEasing) ||
                (kf.easing instanceof StepsEasing) ||
                (includeStepEnd && (kf.easing instanceof StepEndEasing))) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks if all keyframes has linear easing
     */
    protected allKeyframesHaveLinearEasing<T>(keyframes: Keyframe<T>[]): boolean {
        for (const kf of keyframes) {
            if (kf.easing == null ||
                (kf.easing instanceof LinearEasing) ||
                ((kf.easing instanceof CubicEasing) && kf.easing.isLinear)) {
                continue;
            }
            return false;
        }
        return true;
    }

    /**
     * Converts animation so that it uses only cubic easing
     * If no conversion is needed, the same animation instance is returned
     */
    protected convertAnimationToCubicEasing<T>(animation: Animation<T>, linearReplacement?: CubicEasing, replaceStepEnd?: boolean, offsetDelta?: number): Animation<T> {
        let last = animation.keyframes.length - 1;
        if (last < 1) {
            // Nothing to do (we need at least 2 keyframes)
            return animation;
        }

        if (linearReplacement == null) {
            // Default linear replacement
            linearReplacement = CubicLinear.INSTANCE;
        }

        let cloned: boolean = false;

        // Convert linear easing to cubic
        for (let i = 0; i <= last; i++) {
            if (animation.keyframes[i].easing == null || (animation.keyframes[i].easing instanceof LinearEasing)) {
                if (!cloned) {
                    animation = animation.clone();
                    cloned = true;
                }
                animation.keyframes[i].easing = linearReplacement;
            }
        }

        // Now we only have cubic and step

        if (!this.keyframesContainStepEasing(animation.keyframes, replaceStepEnd)) {
            // No step, only cubic (or step-end if no replacement), we are done
            return animation;
        }

        // Clone before changing keyframes
        if (!cloned) {
            animation = animation.clone();
        }

        if (offsetDelta == null) {
            offsetDelta = 1;
        }

        // Remove all keyframes from animation
        const keyframes = animation.keyframes.splice(0);

        let from: Keyframe<T>, to: Keyframe<T>;

        if (!(keyframes[last].easing instanceof CubicEasing)) {
            // just replace it with linear
            // we don't want to end with steps
            keyframes[last].easing = linearReplacement;
        }

        const handler = this.getStepsHandler(animation);

        for (let i = 0; i < last; i++) {
            from = keyframes[i];
            to = keyframes[i + 1];

            if (from.easing instanceof StepEndEasing) {
                if (replaceStepEnd) {
                    handler.stepEnd.call(this, animation, from, to, linearReplacement, offsetDelta);
                } else {
                    // No replacement, leave it as is
                    animation.addKeyframe(from);
                }
                continue;
            }

            if (from.easing instanceof StepStartEasing) {
                handler.stepStart.call(this, animation, from, to, linearReplacement, offsetDelta);
                continue;
            }

            if (from.easing instanceof StepsEasing) {
                handler.steps.call(this, animation, from, to, linearReplacement, offsetDelta);
                continue;
            }

            // Cubic
            handler.cubic.call(this, animation, from, to, linearReplacement, offsetDelta);
        }

        // Add last keyframe
        handler.last.call(this, animation, keyframes[last]);

        return animation;
    }

    protected getStepsHandler<T>(animation: Animation<T>): KeyframeEasingHandler<T> {
        if (animation instanceof MotionAnimation) {
            return {
                stepStart: this.addMotionStepStart,
                stepEnd: this.addMotionStepEnd,
                steps: this.addMotionSteps,
                cubic: this.addCubic,
                last: this.addMotionLast,
            } as any;
        }
        return {
            stepStart: this.addStepStart,
            stepEnd: this.addStepEnd,
            steps: this.addSteps,
            cubic: this.addCubic,
            last: this.addCubic,
        };
    }

    private addCubic<T>(animation: Animation<T>, from: Keyframe<T>): void {
        animation.addKeyframe(from);
    }

    private addStepStart<T>(animation: Animation<T>, from: Keyframe<T>, to: Keyframe<T>, linearReplacement: CubicEasing, offsetDelta: number): void {
        // add current keyframe
        animation.addKeyframe(from.withEasing(linearReplacement));

        if (to.offset - from.offset <= offsetDelta) {
            // add next
            animation.addKeyframe(to.withEasing(linearReplacement));
        } else {
            // add jump
            animation.addKeyframe(new Keyframe<T>(to.value, from.offset + offsetDelta, linearReplacement));
        }
    }

    private addStepEnd<T>(animation: Animation<T>, from: Keyframe<T>, to: Keyframe<T>, linearReplacement: CubicEasing, offsetDelta: number): void {
        // add current keyframe
        animation.addKeyframe(from.withEasing(linearReplacement));

        if (to.offset - from.offset <= offsetDelta) {
            // add next
            animation.addKeyframe(to.withEasing(linearReplacement));
        } else {
            // add hold
            animation.addKeyframe(new Keyframe<T>(from.value, to.offset - offsetDelta, linearReplacement));
        }
    }

    private addSteps<T>(animation: Animation<T>, from: Keyframe<T>, to: Keyframe<T>, linearReplacement: CubicEasing, offsetDelta: number): void {
        // TODO: finish handle steps
        animation.addKeyframe(from.withEasing(linearReplacement));
    }

    private addMotionStepStart(animation: MotionAnimation, from: Keyframe<PathNode>, to: Keyframe<PathNode>, linearReplacement: CubicEasing, offsetDelta: number): void {
        // Remove handle out
        from.value = from.value.withoutHandle(HandleType.Out);

        // add current keyframe
        animation.addKeyframe(from.withEasing(linearReplacement));

        // TODO: keep orientation

        if (to.offset - from.offset <= offsetDelta) {
            // add next
            animation.addKeyframe(to.withEasing(linearReplacement));
        } else {
            // add jump
            animation.addKeyframe(new Keyframe<PathNode>(to.value.withHandles(null, null), from.offset + offsetDelta, linearReplacement));
        }
    }

    private addMotionStepEnd(animation: MotionAnimation, from: Keyframe<PathNode>, to: Keyframe<PathNode>, linearReplacement: CubicEasing, offsetDelta: number): void {
        // Remove handle out
        from.value = from.value.withoutHandle(HandleType.Out);

        // TODO: keep orientation

        // add current
        animation.addKeyframe(from.withEasing(linearReplacement));
        if (to.offset - from.offset <= offsetDelta) {
            // add next
            animation.addKeyframe(to.withEasing(linearReplacement));
        } else {
            // add hold
            animation.addKeyframe(new Keyframe<PathNode>(from.value.withHandles(null, null), to.offset - offsetDelta, linearReplacement));
        }
    }

    private addMotionSteps(animation: MotionAnimation, from: Keyframe<PathNode>, to: Keyframe<PathNode>, linearReplacement: CubicEasing, offsetDelta: number): void {
        // TODO: finish handle steps
        animation.addKeyframe(from.withEasing(linearReplacement));
    }

    private addMotionLast(animation: MotionAnimation, last: Keyframe<PathNode>): void {
        // TODO: keep orientation
        animation.addKeyframe(last);
    }
}

