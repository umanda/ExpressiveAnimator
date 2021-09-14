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

import type {Element, ShapeElement, PathNodeType, WritableKeys} from "@zindex/canvas-engine";
import {
    ClipPathElement,
    HandleType,
    Middleware,
    Path,
    PathElement,
    PathJoint, PathNode,
    PolyElement,
    PolyShape,
    Point,
    equals,
} from "@zindex/canvas-engine";
import type {AnimationProject} from "./AnimationProject";
import type {Animation, Keyframe} from "../Animation";
import type {AnimationDocument} from "./AnimationDocument";
import type {MotionAnimation} from "../Animation";
import {AnimationProjectEvent} from "./AnimationProjectEvent";
import {DocumentAnimationMap, Easing, LinearEasing, sortKeyframes} from "../Animation";
import {getElementTitle} from "../Mapping";

type PropertyHandler = {
    // just set the property to element
    setPropertyValue(element: Element, value: any): boolean;
    // called when the animation was updated
    animationWasUpdated(element: Element, animation: Animation<any>, time: number, priority?: Set<Keyframe<any>>): boolean;
    // called when animation was removed, disabled, or all keyframes were deleted
    animationWasRemoved(element: Element): boolean;
    // Check if the keyframe has the same value
    sameValue(keyframeValue: any, value: any): boolean;
};

export class AnimationMiddleware extends Middleware<AnimationProject> {
    protected propertyHandlers: {[key: string]: PropertyHandler} = {};

    constructor(project: AnimationProject) {
        super(project);

        // Add position property handler
        this.propertyHandlers["position"] = {
            setPropertyValue(element: Element, value: PathNode | Point): boolean {
                if (value instanceof PathNode) {
                    value = value.point;
                }
                if (element.position.equals(value as Point)) {
                    return false;
                }
                element.position = value;
                return true;
            },
            sameValue(keyframeValue: PathNode, value: PathNode | Point): boolean {
                if (value instanceof Point) {
                    return keyframeValue.point.equals(value);
                }
                return keyframeValue.equals(value);
            },
            animationWasUpdated(element: Element, animation: MotionAnimation, time: number, priority?: Set<Keyframe<PathNode>>) {
                return element.setAutoOrientAngle(animation.getOrientationAtOffset(time, priority));
            },
            animationWasRemoved(element: Element): boolean {
                return element.setAutoOrientAngle(0);
            }
        }
    }

    getElementTitle(el: Element): string {
        return getElementTitle(el);
    }

    ensureNodePairHasHandles(element: PathElement | ClipPathElement, from: number, to: number, t?: number, cubic?: boolean): boolean {
        if (!super.ensureNodePairHasHandles(element, from, to, t, cubic)) {
            return false;
        }

        this.updateEveryKeyframe(element, "nodes", nodes => Path.ensurePairHasHandles(nodes, from, to, t, cubic));

        return true;
    }

    ensureNodeHasBothHandles(element: PathElement | ClipPathElement, index: number): boolean {
        if (!super.ensureNodeHasBothHandles(element, index)) {
            return false;
        }

        this.updateEveryKeyframe(element, "nodes", nodes => Path.ensureNodeHasBothHandles(nodes, index));

        return true;
    }

    continueWithNodeAtPosition(element: PathElement | ClipPathElement, index: number, position: Point): boolean {
        if (!super.continueWithNodeAtPosition(element, index, position)) {
            return false;
        }

        this.updateEveryKeyframe(element, "nodes", nodes => Path.continueWithNode(nodes, index, position));

        return true;
    }

    updatePathNode(element: PathElement | ClipPathElement, node: PathNode, index: number): boolean {
        if (!super.updatePathNode(element, node, index)) {
            return false;
        }

        this.updateEveryKeyframe(element, "nodes", nodes => Path.updateNodeAt(nodes, node, index));

        return true;
    }

    ensureContinuedPathIsValid(element: PathElement | ClipPathElement): boolean {
        if (!(element instanceof PathElement) && !(element instanceof ClipPathElement)) {
            return false;
        }

        let changed: boolean = false;

        const nodes = element.nodes;
        const length = nodes.length;

        this.updateEveryKeyframe(element, "nodes", n => {
            if (nodes === n) {
                return n;
            }

            let sliced: boolean = false;

            // We will just convert null handles to non-null
            for (let i = 0; i < length; i++) {
                if (nodes[i].type !== n[i].type || nodes[i].joint !== n[i].joint || nodes[i].joint === PathJoint.Corner) {
                    continue;
                }

                const uIn = nodes[i].handleIn && !n[i].handleIn;
                const uOut = nodes[i].handleOut && !n[i].handleOut;

                if (uIn || uOut) {
                    if (!sliced) {
                        n = n.slice();
                        sliced = true;
                        changed = true;
                    }
                    n[i] = n[i].withHandles(n[i].handleIn || n[i].point, n[i].handleOut || n[i].point);
                }
            }

            return n;
        });

        return changed;
    }

    changeNodesJoint(element: PathElement | ClipPathElement, joint: PathJoint, indexes: Set<number> | null): boolean {
        if (!super.changeNodesJoint(element, joint, indexes)) {
            return false;
        }

        this.updateEveryKeyframe(element, "nodes", nodes => Path.changeJoint(nodes, joint, indexes));

        return true;
    }

    breakNodes(element: PathElement | ClipPathElement, indexes: Set<number> | null): boolean {
        if (!super.breakNodes(element, indexes)) {
            return false;
        }

        this.updateEveryKeyframe(element, "nodes", nodes => Path.breakNodes(nodes, indexes));

        return true;
    }

    closeContoursAt(element: PathElement | ClipPathElement, indexes: Set<number> | null, withLine?: boolean): boolean {
        if (!super.closeContoursAt(element, indexes, withLine)) {
            return false;
        }

        this.updateEveryKeyframe(element, "nodes", nodes => Path.closeContoursAt(nodes, indexes, withLine));

        return true;
    }

    removeNodeHandle(element: PathElement | ClipPathElement, index: number, type: HandleType): boolean {
        if (!super.removeNodeHandle(element, index, type)) {
            return false;
        }

        this.updateEveryKeyframe(element, "nodes", nodes => Path.removeNodeHandle(nodes, index, type));

        return true;
    }

    changeNodesType(element: PathElement | ClipPathElement, type: PathNodeType, index: number): boolean {
        if (!super.changeNodesType(element, type, index)) {
            return false;
        }

        this.updateEveryKeyframe(element, "nodes", nodes => Path.changeType(nodes, type, index));

        return true;
    }

    addPointAfter(element: PolyElement, index: number, percent: number): boolean {
        if (!super.addPointAfter(element, index, percent)) {
            return false;
        }

        const isClosed = element.shape.isClosed;
        // Current keyframe might have the point inserted, check total
        const total = element.points.length;
        this.updateEveryKeyframe(element, "points", points => points.length === total ? points : PolyShape.addPointAfter(points, index, percent, isClosed));

        return true;
    }

    addNodeAfter(element: PathElement | ClipPathElement, index: number, percent: number): boolean {
        if (!super.addNodeAfter(element, index, percent)) {
            return false;
        }

        // Current keyframe might have the node inserted, check total
        const total = element.nodes.length;
        this.updateEveryKeyframe(element, "nodes", nodes => nodes.length === total ? nodes : Path.addNodeAfter(nodes, index, percent));

        return true;
    }

    deleteNodeHandle(element: PathElement | ClipPathElement, index: number, which: HandleType): boolean {
        if (!super.deleteNodeHandle(element, index, which)) {
            return false;
        }

        this.updateEveryKeyframe(element, "nodes", nodes => Path.removeNodeHandle(nodes, index, which));

        return true;
    }

    deleteNodes(element: Element, indexes: Set<number>): boolean {
        if (!super.deleteNodes(element, indexes)) {
            return false;
        }

        // Current keyframe can be with deleted nodes, check total
        if ((element instanceof PathElement) || (element instanceof ClipPathElement)) {
            const total = element.nodes.length;
            this.updateEveryKeyframe(element, "nodes", nodes => nodes.length === total ? nodes : Path.deleteNodes(nodes, indexes));
        } else if (element instanceof PolyElement) {
            const total = element.points.length;
            this.updateEveryKeyframe(element, "points", points => points.length === total ? points : PolyShape.deletePoints(points, indexes));
        }

        return true;
    }

    deleteSelectedKeyframes(): boolean {
        const selection = this._project.keyframeSelection;
        if (selection.isEmpty) {
            return false;
        }

        const documentAnimation = this._project.document.animation;

        let changed: boolean = false;
        let deleted: boolean;

        for (const animation of documentAnimation.allAnimations()) {
            deleted = false;
            for (let i = animation.keyframes.length - 1; i >= 0; i--) {
                if (selection.isKeyframeSelected(animation.keyframes[i])) {
                    animation.removeKeyframe(animation.keyframes[i]);
                    deleted = true;
                }
            }
            if (deleted) {
                changed = true;
            }
        }

        if (!changed) {
            return false;
        }

        selection.clear();
        this.removeEmptyAnimations();

        return true;
    }

    get animationMap(): DocumentAnimationMap | null {
        return this._project.document?.animation;
    }

    * selectedKeyframesStruct(offset: number | null = null, clone: boolean = true): Generator<{id: string, animation: Animation<any>, keyframes: Keyframe<any>[]}> {
        const selection = this._project.keyframeSelection;
        if (selection.isEmpty) {
            return;
        }

        const animationMap = this.animationMap;
        if (animationMap == null || animationMap.isEmpty) {
            return;
        }

        for (const [id, animation] of animationMap.getAllAnimations()) {
            if (animation.disabled) {
                continue;
            }

            const list = [];

            for (const keyframe of animation.keyframes) {
                if (selection.isKeyframeSelected(keyframe)) {
                    list.push(clone ? keyframe.clone(true) : keyframe);
                }
            }

            if (list.length > 0) {
                list.sort(sortKeyframes);

                if (offset != null) {
                    const add = offset - list[0].offset;
                    if (add !== 0) {
                        for (const kf of list) {
                            kf.offset += add;
                        }
                    }
                }

                yield {
                    id,
                    animation,
                    keyframes: list,
                };
            }
        }
    }

    reverseKeyframes(keyframes: Keyframe<any>[], sort: boolean = true): boolean {
        if (keyframes.length < 2) {
            return false;
        }

        if (sort) {
            keyframes.sort(sortKeyframes);
        }

        const last = keyframes.length - 1;
        const middle = last / 2;

        for (let i = 0; i < middle; i++) {
            const {value, easing} = keyframes[i];
            const j = last - i;
            keyframes[i].value = keyframes[j].value;
            keyframes[i].easing = keyframes[j].easing?.inverse || null;

            keyframes[j].value = value;
            keyframes[j].easing = easing?.inverse || null;
        }

        if (last % 2 === 0) {
            const i = last / 2;
            keyframes[i].easing = keyframes[i].easing?.inverse || null;
        }

        return true;
    }

    reverseSelectedKeyframes(): boolean {
        const animations = new Set<Animation<any>>();

        for (const struct of this.selectedKeyframesStruct(null, false)) {
            if (this.reverseKeyframes(struct.keyframes, false)) {
                animations.add(struct.animation);
            }
        }

        if (animations.size > 0) {
            this.updateAnimations({animations});
            return true;
        }

        return false;
    }

    duplicateSelectedKeyframes(time?: number, reverse?: boolean): boolean {
        const animations = new Set<Animation<any>>();

        const selected = [];

        for (const struct of this.selectedKeyframesStruct(time ?? this.project.time, true)) {
            if (reverse) {
                this.reverseKeyframes(struct.keyframes, false);
            }
            for (const kf of struct.keyframes) {
                struct.animation.addKeyframe(kf);
            }
            animations.add(struct.animation);
            selected.push(...struct.keyframes);
        }

        if (animations.size > 0) {
            this.project.keyframeSelection.selectMultipleKeyframes(selected);
            this.updateAnimations({animations});
            return true;
        }

        return false;
    }

    mergeSelectedKeyframes(): Map<string, Map<string, Keyframe<any>[]>> {
        const types = new Map<string, Map<string, Keyframe<any>[]>>();

        for (const struct of this.selectedKeyframesStruct(null)) {
            const type = struct.animation.type ?? "*";
            const prop = struct.animation.property;

            if (!types.has(type)) {
                types.set(type, new Map<string, Keyframe<any>[]>());
            }

            const current = types.get(type);

            if (!current.has(prop)) {
                current.set(prop, struct.keyframes);
                continue;
            }

            const keyframes = current.get(prop);

            if (prop === "nodes" && (type === "path" || type === "clip-path")) {
                if (!Path.canInterpolateNodes(keyframes[0].value, struct.keyframes[0].value)) {
                    // cannot interpolate
                    continue;
                }
            }

            keyframes.push(...struct.keyframes);
        }

        if (types.size === 0) {
            return types;
        }

        for (const map of types.values()) {
            for (const keyframes of map.values()) {
                // sort
                keyframes.sort(sortKeyframes);

                // remove duplicate offsets
                for (let i = keyframes.length - 1; i > 0; i--) {
                    if (keyframes[i].offset === keyframes[i - 1].offset) {
                        keyframes.splice(i, 1);
                    }
                }

                // normalize offset to 0
                const min = keyframes[0].offset;
                if (min !== 0) {
                    keyframes.forEach(keyframe => keyframe.offset -= min);
                }
            }
        }

        return types;
    }

    setEasingForSelectedKeyframes(easing: Easing | string | null): boolean {
        if (this.toolIsWorking || this._project.keyframeSelection.isEmpty) {
            return false;
        }

        const map = this.animationMap;
        if (!map || map.isEmpty) {
            return false;
        }

        if (typeof easing === 'string') {
            easing = this._project.easingManager.get(easing);
            if (easing == null) {
                return false;
            }
        }

        if (easing instanceof LinearEasing) {
            easing = null;
        }

        const selection = this._project.keyframeSelection;

        let changed: boolean = false;

        for (const {animation, selected} of map.getSelectedKeyframes(selection)) {
            if (selected.length < 2) {
                continue;
            }

            for (const keyframe of selected) {
                if (keyframe.easing === easing) {
                    continue;
                }

                if (easing === null && (keyframe.easing instanceof LinearEasing)) {
                    // not really changed, just simplified
                    keyframe.easing = null;
                    continue;
                }

                const next = animation.getNextKeyframe(keyframe);
                if (next == null || !selection.isKeyframeSelected(next)) {
                    continue;
                }

                keyframe.easing = easing as Easing;
                changed = true;
            }
        }

        return changed;
    }

    fitAllKeyframes(start?: number, end?: number): boolean {
        const document = this._project.document;
        if (!document.animation || !document.animation.fitAllKeyframes(start, end)) {
            return false;
        }

        this._project.keyframeSelection.clear();
        this.updateAnimatedProperties(document);

        return true;
    }

    removeEmptyAnimations(): boolean {
        const document = this._project.document;
        if (!document.animation) {
            return false;
        }

        return document.animation.removeEmptyAnimations((id, property) => {
            const handler = this.propertyHandlers[property];
            if (!handler) {
                return;
            }

            const element = document.getElementById(id);
            if (element) {
                handler.animationWasRemoved(element);
            }
        });
    }

    setTime(time: number): boolean {
        if (this.project.setTime(time)) {
            return this.updateAnimatedProperties(this.project.document);
        }
        return false;
    }

    getTime(): number {
        return this.project.time;
    }

    splitPathElement(element: PathElement, keepOriginal?: boolean): PathElement[] | null {
        let animatedProperties = (element.document as AnimationDocument)?.animation?.getAnimatedProperties(element);
        if (!animatedProperties) {
            return super.splitPathElement(element, keepOriginal);
        }

        animatedProperties = {...animatedProperties};

        const result = super.splitPathElement(element, keepOriginal);

        if (!result) {
            return null;
        }

        const nodesAnimation = animatedProperties.nodes;
        delete animatedProperties.nodes;

        let offset: number = 0;

        for (const el of result) {
            const document = el.document as AnimationDocument;

            // copy all animations
            for (const animation of Object.values(animatedProperties)) {
                document.animation.addAnimation(el, animation.clone(true));
            }
            if (!nodesAnimation) {
                continue;
            }

            const animation = this.project.animatorSource.createAnimation(el, "nodes");

            const length = el.nodes.length;

            for (const kf of nodesAnimation.keyframes) {
                animation.addKeyframe(animation.createKeyframe(kf.value.slice(offset, offset + length), kf.offset, kf.easing));
            }

            document.animation.addAnimation(el, animation);

            offset += length;
        }

        return result;
    }

    protected convertToPathInternal(element: ShapeElement<any>, keepOriginal?: boolean, path?: Path): PathElement | null {
        const animation = (element.document as AnimationDocument).animation;
        const newElement = super.convertToPathInternal(element, keepOriginal, path);
        if (!newElement || keepOriginal) {
            return newElement;
        }

        // Cleanup old animators
        if (element.id === newElement.id && (path != null || !(element instanceof PathElement))) {
            animation.removeAnimatedProperties(element, this.project.animatorSource.specificAnimatorProperties(element.type));
        }

        return newElement;
    }

    protected simplifyPath(element: PathElement): boolean {
        if (!super.simplifyPath(element)) {
            return false;
        }

        (element.document as AnimationDocument).animation?.removeAnimatedProperties(element, ['nodes']);

        return true;
    }

    duplicateElement(element: Element): Element {
        const clone = super.duplicateElement(element);

        const map = (element.document as AnimationDocument)?.animation;

        if (!map) {
            return clone;
        }

        const copyAnimations = (src: Element, dst: Element) => {
            map.copyAnimations(src, dst);

            if (!element.supportsChildren || !element.hasChildren) {
                return;
            }

            const children = Array.from(dst.children());

            for (const child of src.children()) {
                copyAnimations(child, children.shift());
            }
        }

        copyAnimations(element, clone);

        return clone;
    }

    /**
     * @inheritDoc
     */
    deleteElements(elements: Iterable<Element>, deselect: boolean = false, dispose: ((el: Element) => void) | boolean = false): boolean {
        if (!super.deleteElements(elements, deselect, dispose)) {
            return false;
        }

        this.project.document.animation?.cleanupAnimatedProperties();

        return true;
    }

    /**
     * Updates the document animated properties
     */
    updateAnimatedProperties(document: AnimationDocument, time?: number): boolean {
        const animation = document.animation;

        if (!animation) {
            return false;
        }

        if (time == null) {
            time = this.project.time;
        }

        return animation.updateAnimatedProperties(time, this.setAnimatedPropertyValue.bind(this));
    }

    updateElementAnimation(element: Element, property: string): boolean {
        const animation = this.project.document.animation;
        if (!animation) {
            return false;
        }
        return animation.updateAnimatedProperty(
            this.project.time,
            element,
            property as any,
            this.setAnimatedPropertyValue.bind(this)
        );
    }

    /**
     * Updates only some animations
     */
    updateAnimations(filter: {animations: Set<Animation<any>>, keyframes?: Set<Keyframe<any>>}): boolean {
        const animation = this.project.document.animation;
        if (!animation) {
            return false;
        }
        return animation.updateAnimatedProperties(this.project.time, this.setAnimatedPropertyValue.bind(this), filter);
    }

    /**
     * Get property animation from element, or null if no animation is defined
     */
    getAnimation<E extends Element, K extends WritableKeys<E>>(element: E, property: K): Animation<E[K]> | null {
        return (element.document as AnimationDocument).animation?.getAnimation(element, property);
    }

    /**
     * Internal method to update every keyframe value
     */
    protected updateEveryKeyframe<E extends Element, K extends WritableKeys<E>>(element: E, property: K, callback: (value: E[K], animation: Animation<E[K]>, element: E, property: K) => any): boolean {
        const animation = this.getAnimation(element, property);
        if (!animation) {
            return;
        }

        let changed: boolean = false;
        animation.keyframes.forEach(keyframe => {
            const value = callback(keyframe.value, animation, element, property);
            // Keep the strict equality check
            if (value !== keyframe.value) {
                animation.setKeyframeValue(keyframe, value);
                changed = true;
            }
        });

        if (!changed) {
            return false;
        }

        // Call property handler if any
        const handler = this.propertyHandlers[property];
        if (handler) {
            handler.animationWasUpdated(element, animation, this.project.time);
        }

        return true;
    }

    protected setAnimatedPropertyValue<E extends Element, K extends WritableKeys<E>, V extends E[K]>(
        element: E, property: K, value: V,
        animation: Animation<E[K]>, time: number,
        priority?: Set<Keyframe<V>>
    ): boolean {
        // if value is null then animation is disabled or has no keyframes

        const handler = this.propertyHandlers[property];
        if (handler) {
            if (value == null) {
                return handler.animationWasRemoved(element);
            }

            const changed = handler.setPropertyValue(element, value);
            return handler.animationWasUpdated(element, animation, time, priority) || changed;
        }


        return value == null ? false : super.setElementProperty(element, property, value);
    }

    /**
     * @override
     */
    setElementProperty<E extends Element, K extends WritableKeys<E>, V extends E[K]>(element: E, property: K, value: V): boolean {
        const project = this._project;

        let animation = this.getAnimation<E, K>(element, property);
        let keyframeAdded: boolean = false;

        // Get property handler
        const handler: PropertyHandler | null = this.propertyHandlers[property];

        if (!animation) {
            const documentAnimation = (element.document as AnimationDocument).animation;

            if (!documentAnimation || !project.isRecording) {
                // document is not animated OR
                // we are not recording animations
                if (handler) {
                    return handler.setPropertyValue(element, value);
                }
                return super.setElementProperty(element, property, value);
            }

            if (project.animatorSource.isAnimatable(element, property)) {
                // create a new empty animation
                animation = project.animatorSource.createAnimation(element, property);
                if (!animation || !documentAnimation.addAnimation(element, animation)) {
                    return false;
                }
                // Add first keyframe
                if (documentAnimation.startTime !== project.time) {
                    animation.addKeyframeAtOffset(documentAnimation.startTime, element[property]);
                    keyframeAdded = true;
                }
            } else {
                // property is not animatable
                if (handler) {
                    return handler.setPropertyValue(element, value);
                }
                return super.setElementProperty(element, property, value);
            }
        } else if (animation.disabled) {
            // animation is disabled
            if (handler) {
                return handler.setPropertyValue(element, value);
            }
            return super.setElementProperty(element, property, value);
        }

        const time = project.time;
        let keyframe = animation.getKeyframeAtOffset(time);

        if (keyframe) {
            if (handler ? handler.sameValue(keyframe.value, value) : equals(keyframe.value, value)) {
                // Same value on keyframe, check property value
                const changed = handler
                    ? handler.setPropertyValue(element, value)
                    : super.setElementProperty(element, property, value);
                // New keyframe added
                if (keyframeAdded && project.document === element.document) {
                    project.engine?.emit(AnimationProjectEvent.keyframeAdded, {element, animation});
                }
                return changed;
            }
            // Update keyframe value
            animation.setKeyframeValue(keyframe, value);
        } else {
            // Add a new keyframe
            if (handler) {
                // handler usually has custom animation
                animation.addKeyframeAtOffset(time, value);
            } else {
                animation.addKeyframe(animation.createKeyframe(value, time));
            }
            keyframeAdded = true;
        }

        if (handler) {
            handler.setPropertyValue(element, value);
            handler.animationWasUpdated(element, animation, time);
        } else {
            super.setElementProperty(element, property, value);
        }

        // New keyframe added
        if (keyframeAdded && project.document === element.document) {
            project.engine?.emit(AnimationProjectEvent.keyframeAdded, {element, animation});
        }

        return true;
    }
}