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

import type {
    ClipPathElement,
    Element,
    EllipseElement,
    GroupElement,
    LineElement,
    MaskElement,
    PathElement,
    PointStruct,
    PolyElement,
    RectElement,
    RegularPolygonElement,
    Shape,
    ShapeElement,
    StarElement,
    SymbolElement,
    TextElement,
    VectorElement
} from "@zindex/canvas-engine";
import {
    BlendMode,
    Brush,
    BrushType,
    Color,
    FillRule,
    GradientBrush,
    leastCommonMultiple,
    LinearGradientBrush,
    Matrix,
    Orientation,
    PaintOrder,
    Path,
    PathNode, Point,
    RadialGradientBrush,
    roundDecimals,
    SolidBrush,
    SpreadMethod,
    StopColorList,
    StrokeLineCap,
    StrokeLineJoin,
    TwoPointGradientBrush,
} from "@zindex/canvas-engine";
import type {AnimationProject} from "../AnimationProject";
import type {AnimationDocument} from "../AnimationDocument";
import type {Animation, CubicEasing, Keyframe, MotionAnimation, RectRadiusAnimation} from "../../Animation";
import {GenericExporter} from "./GenericExporter";

type PathNodeElement = PathElement | ClipPathElement;
type ExporterSettings = {
    size?: { width: number, height: number },
    fixedSize: boolean,
    freeze: boolean,
    repeat: number,
    repeatTime: number
}

export class SMILAnimationExporter extends GenericExporter {
    dispose(): void {
        this.definitions = this.svgDocument = this.rootElement = null;
    }

    private definitions: SVGDefsElement;
    private rootElement: SVGSVGElement;
    private svgDocument: Document;
    private readonly settings: ExporterSettings;
    private readonly elementMap: Map<string, (element: Element) => SVGElement | null> = new Map<string, (element: Element) => (SVGElement | null)>([
        ['rect', this.serializeRectElement],
        ['ellipse', this.serializeEllipseElement],
        ['poly', this.serializePolyElement],
        ['line', this.serializeLineElement],
        ['path', this.serializePathElement],
        ['star', this.serializeStarElement],
        ['regular-polygon', this.serializeRegularPolygonElement],
        ['text', this.serializeTextElement],
        ['group', this.serializeGroupElement],
        ['clip-path', this.serializeClipPathElement],
        ['mask', this.serializeMaskElement],
        ['symbol', this.serializeSymbolElement],
    ])

    constructor(settings?: ExporterSettings) {
        super();
        if (!settings) {
            settings = {
                size: null,
                fixedSize: false,
                freeze: true,
                repeat: 1,
                repeatTime: 0
            }
        }
        this.svgDocument = document.implementation.createDocument('http://www.w3.org/2000/svg', null, null);
        this.rootElement = this.svgDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgDocument.append(this.rootElement);
        this.rootElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        this.settings = settings;
    }

    async export(project: AnimationProject): Promise<ReadableStream> {
        let self = this;
        return new ReadableStream<any>({
            async start(controller) {
                self.serializeDocument(project.masterDocument);
                const blob = new Blob([self.svgDocument.documentElement.outerHTML], {type: "text/svg"});
                controller.enqueue((await blob.arrayBuffer()));
                controller.close();
            }
        });
    }

    addToDefs(...elements: SVGElement[]) {
        if (!this.definitions) {
            this.definitions = this.svgDocument.createElementNS('http://www.w3.org/2000/svg', 'defs');
            this.rootElement.append(this.definitions);
        }
        for (let element of elements) {
            this.definitions.append(element);
        }
    }

    createElement(name: string): SVGElement {
        return this.svgDocument.createElementNS('http://www.w3.org/2000/svg', name);
    }

    createAnimation<T>(attribute: string, animation: Animation<T>, valueMap: ((keyframe: Keyframe<T>) => any) = k => k.value): SVGElement {
        return this.createKeyframesAnimation(attribute, animation.keyframes, valueMap);
    }

    protected handleAnimationEasing<T>(animation: Animation<T>): Animation<T> {
        return this.convertAnimationToCubicEasing(animation, null, true, 1);
    }

    getTimingInfo<T>(keyframes: Keyframe<T>[]): {linear: boolean, times: string, splines: string} {
        let linear: boolean = true;
        const times: number[] = [];
        const splines = [];

        for (const kf of keyframes) {
            // Add times
            times.push(roundDecimals(kf.offset / this.endTime));

            // Every easing is converted to cubic
            const easing = kf.easing as CubicEasing;
            if (linear && !easing.isLinear && (kf !== keyframes[keyframes.length - 1])) {
                linear = false;
            }

            // Add splines
            splines.push(easing.toArray().map(roundDecimals).join(' '));
        }

        // remove last keyframe splines
        splines.pop();

        return {
            linear,
            times: times.join(';'),
            splines: splines.join(';')
        };
    }

    createKeyframesAnimation(attribute: string|null,
                             keyframes: Keyframe<any>[],
                             valueMap = k => k.value,
                             elementType = 'animate',
                             valuesAttr = 'values',
                             valueWrapper = (v: any[]) => v.join(';'),
                             extra: {name: string, value: string}[] = []
    ): SVGElement {
        const animationElement = this.createElement(elementType);

        if (attribute) {
            animationElement.setAttribute('attributeName', attribute);
        }

        animationElement.setAttribute(valuesAttr, valueWrapper(keyframes.map(valueMap)));

        const timing = this.getTimingInfo(keyframes);

        if (timing.linear) {
            animationElement.setAttribute('calcMode', 'linear');
            animationElement.setAttribute('keyTimes', timing.times);
        } else {
            animationElement.setAttribute('calcMode', 'spline');
            animationElement.setAttribute('keyTimes', timing.times);
            animationElement.setAttribute('keySplines', timing.splines);
        }

        this.addTimeSettingsAttributes(animationElement);

        for (const attr of extra) {
            animationElement.setAttribute(attr.name, attr.value);
        }

        return animationElement;
    }

    addTimeSettingsAttributes(element: SVGElement): void {
        const settings = this.settings;

        element.setAttribute('begin', `0ms`);
        element.setAttribute('dur', `${this.endTime}ms`);
        element.setAttribute('fill', settings.freeze ? 'freeze' : 'remove');

        if (settings.repeat === 0) {
            element.setAttribute('repeatCount', 'indefinite');
            if (settings.repeatTime > 0) {
                element.setAttribute('repeatDur', settings.repeatTime + 'ms');
            }
        } else if (settings.repeat > 1) {
            element.setAttribute('repeatCount', settings.repeat.toString());
        }
    }

    createTransformAnimation(type: string, animation: Animation<any>, valueMap = k => k.value, additive?: boolean): SVGElement {
        const extra = [{name: 'type', value: type}];

        if (additive) {
            extra.push({name: 'additive', value: 'sum'});
        }

        return this.createKeyframesAnimation(
            'transform',
            animation.keyframes,
            valueMap,
            'animateTransform',
            'values',
            (k: any[]) => k.join(';'),
            extra
        );
    }

    createDummyTransformAnimation(type: string, value: string | number, additive?: boolean): SVGElement {
        const element = this.createElement("animateTransform");

        element.setAttribute('attributeName', 'transform');
        element.setAttribute('type', type);
        element.setAttribute('from', value.toString());
        element.setAttribute('to', value.toString());
        element.setAttribute('calcMode', 'discrete');

        if (additive) {
            element.setAttribute('additive', 'sum');
        }

        this.addTimeSettingsAttributes(element);

        return element;
    }

    /**
     * Adds transform, opacity, blend mode & isolate
     */
    addBasicProperties(element: Element, svgElement: SVGElement): void {
        svgElement.setAttribute('id', element.id);

        if (element.title != null) {
            svgElement.setAttribute('title', element.title);
        }

        // Transform
        this.addTransformProperties(element, svgElement);

        // Opacity
        const opacity = this.getProperty(element, "opacity");
        if (opacity.value !== 1) {
            svgElement.setAttribute("opacity", opacity.value.toString());
        }
        if (opacity.animation) {
            svgElement.appendChild(this.createAnimation('opacity', opacity.animation));
        }

        // Blend mode
        if (element.blend !== BlendMode.Normal) {
            svgElement.style.mixBlendMode = this.getBlendMode(element.blend);
        }

        // Isolate
        if (element.isolate && element.supportsChildren) {
            svgElement.style.isolation = 'isolate';
        }
    }

    createMotionAnimation(animation: MotionAnimation, orientation: Orientation, additive?: boolean, relative?: boolean) {
        const extra = [];

        if (additive) {
            extra.push({name: 'additive', value: 'sum'});
        }

        if (orientation !== Orientation.None) {
            extra.push({name: "rotate", value: orientation === Orientation.AutoReverse ? "auto-reverse" : "auto"});
        }

        const points = this.getMotionKeyPoints(animation.keyframes);
        if (points != null) {
            extra.push({name: 'keyPoints', value: points});
        }

        return this.createKeyframesAnimation(
            null,
            animation.keyframes,
            k => k.value,
            'animateMotion',
            'path',
            (k: PathNode[]) => {
                const length = k.length;
                // Remove duplicate path nodes
                if (length > 2) {
                    if (k[length - 1] === k[length - 2]) {
                        k.pop();
                    }
                    if (k[0] === k[1]) {
                        k.shift();
                    }
                }
                return Path.nodesToString(k, relative);
            },
            extra
        );
    }

    getMotionKeyPoints(keyframes: Keyframe<PathNode>[]): string | null {
        const segments = [0];

        let total: number = 0;

        for (let i = 1; i < keyframes.length; i++) {
            const from = keyframes[i - 1].value;
            const to = keyframes[i].value;
            // same instance
            if (from === to) {
                segments.push(total);
                continue;
            }
            let d = from.getDistance(to);
            if (d === 0 || Number.isNaN(d)) {
                segments.push(total);
                continue;
            }
            total += d;
            segments.push(total);
        }

        if (total === 0) {
            return null;
        }

        return segments.map(v => roundDecimals(v / total)).join(';');
    }

    addTransformProperties(element: Element, svgElement: SVGElement): void {
        const motion = this.getProperty(element, "position");
        const rotate = this.getProperty(element, "rotate");
        const skewAngle = this.getProperty(element, "skewAngle");
        const skewAxis = this.getProperty(element, "skewAxis");
        const scale = this.getProperty(element, "scale");
        const anchor = this.getProperty(element, "anchor");

        const hasMotionAnimation = this.isMotionPathUsed(element);
        const hasSkewAnimation = skewAngle.animation != null || (skewAxis.animation != null && skewAngle.value !== 0);

        let startAngle = 0;
        if (hasMotionAnimation) {
            if (element.orientation !== Orientation.None) {
                // Extract the angle from the original animation
                // Because sometimes it is extended with step-start and the angle is 0
                const anim = this.currentDocument.animation.getAnimation(element, "position") as any as MotionAnimation;
                startAngle = anim.getOrientationAtOffset(this.startTime);
                if (element.orientation === Orientation.AutoReverse) {
                    startAngle += 180;
                }
            }
        }

        const matrix = new Matrix();
        matrix
            .translate(motion.value.x, motion.value.y)
            .rotate(rotate.value + startAngle)
            .skewAxis(skewAngle.value, skewAxis.value)
            .scale(scale.value.x, scale.value.y)
            .translate(-anchor.value.x, -anchor.value.y);

        if (!matrix.isIdentity) {
            svgElement.setAttribute('transform', matrix.toString());
        }

        if (!hasMotionAnimation && !hasSkewAnimation && !rotate.animation && !scale.animation && !anchor.animation) {
            return;
        }

        let additive: boolean = false;

        if (hasMotionAnimation) {
            svgElement.appendChild(this.createDummyTransformAnimation('translate', '0 0', additive));
            additive = true;
            svgElement.appendChild(this.createMotionAnimation(motion.animation as any, element.orientation, additive, false));
        } else if (motion.value.x !== 0 && motion.value.y !== 0) {
            svgElement.appendChild(this.createDummyTransformAnimation('translate', this._pointToStr(motion.value), additive));
            additive= true;
        }

        if (rotate.animation) {
            svgElement.appendChild(this.createTransformAnimation('rotate', rotate.animation, k => this._round(k.value), additive));
            additive = true;
        } else if (rotate.value % 360 !== 0) {
            svgElement.appendChild(this.createDummyTransformAnimation('rotate', this._round(rotate.value), additive));
            additive = true;
        }

        if (skewAngle.animation) {
            if (skewAxis.animation) {
                svgElement.appendChild(this.createTransformAnimation('rotate', skewAxis.animation, k => this._round(k.value, -1), additive));
                additive = true;
                svgElement.appendChild(this.createTransformAnimation('skewX', skewAngle.animation, k => this._round(k.value, -1), additive));
                svgElement.appendChild(this.createTransformAnimation('rotate', skewAxis.animation, k => this._round(k.value), additive));
            } else {
                svgElement.appendChild(this.createDummyTransformAnimation('rotate', this._round(skewAxis.value, -1), additive));
                additive = true;
                svgElement.appendChild(this.createTransformAnimation('skewX', skewAngle.animation, k => this._round(k.value, -1), additive));
                svgElement.appendChild(this.createDummyTransformAnimation('rotate', this._round(skewAxis.value), additive));
            }
        } else if (skewAngle.value !== 0) {
            if (skewAxis.animation) {
                svgElement.appendChild(this.createTransformAnimation('rotate', skewAxis.animation, k => this._round(k.value, -1), additive));
                additive = true;
                svgElement.appendChild(this.createDummyTransformAnimation('skewX', this._round(skewAngle.value, -1), additive));
                svgElement.appendChild(this.createTransformAnimation('rotate', skewAxis.animation, k => this._round(k.value), additive));
            } else {
                svgElement.appendChild(this.createDummyTransformAnimation('skewX', this._round(skewAngle.value, -1), additive));
                additive = true;
            }
        }

        if (scale.animation) {
            svgElement.appendChild(this.createTransformAnimation('scale', scale.animation, k => this._pointToStr(k.value), additive));
            additive = true;
        } else if (scale.value.x !== 1 || scale.value.y !== 1) {
            svgElement.appendChild(this.createDummyTransformAnimation('scale', this._pointToStr(scale.value), additive));
            additive = true;
        }

        if (anchor.animation) {
            svgElement.appendChild(this.createTransformAnimation('translate', anchor.animation, k => this._pointToStr(k.value, -1), additive));
        } else if (!anchor.value.isZero) {
            svgElement.appendChild(this.createDummyTransformAnimation('translate', this._pointToStr(anchor.value, -1), additive));
        }
    }

    private _round(value: number, scale: number = 1): number {
        return scale * roundDecimals(value);
    }

    private _pointToStr(value: PointStruct, scale: number = 1): string {
        return `${scale * roundDecimals(value.x)} ${scale * roundDecimals(value.y)}`;
    }

    /**
     * Fill, stroke, paint order
     */
    addVectorProperties(element: VectorElement, svgElement: SVGElement): void {
        // Fill
        this.addFillProperties(element, svgElement);
        // Stroke
        this.addStrokeProperties(element, svgElement);
        // Paint order
        if (element.paintOrder !== PaintOrder.FillStrokeMarkers) {
            // TODO: add other paint orders when we support markers
            // now we only support fill-stroke-markers (default) and stroke-fill-markers
            svgElement.setAttribute('paint-order', 'stroke');
        }
    }

    /**
     * Fill color, opacity, rule
     */
    addFillProperties(element: VectorElement, svgElement: SVGElement): void {
        if (!this.isFillPaintVisible(element)) {
            svgElement.setAttribute('fill', 'none');
            return;
        }

        // Fill
        const fill = this.getProperty(element, "fill");
        if (fill.animation) {
            this.addBrushAnimation(element, svgElement, "fill", fill.animation);
        } else {
            svgElement.setAttribute('fill', this.getBrush(fill.value, 'fill-' + element.id));
        }

        // Fill opacity
        const fillOpacity = this.getProperty(element, "fillOpacity");
        if (fillOpacity.value !== 1) {
            svgElement.setAttribute('fill-opacity', fillOpacity.value.toString());
        }
        if (fillOpacity.animation) {
            svgElement.appendChild(this.createAnimation('fill-opacity', fillOpacity.animation));
        }

        // Fill rule
        if (element.fillRule !== FillRule.NonZero) {
            svgElement.setAttribute('fill-rule', "evenodd");
        }
    }

    /**
     * Stroke color, opacity, with, miter, join, cap, dashes, offset
     */
    addStrokeProperties(element: VectorElement, svgElement: SVGElement): void {
        if (!this.isStrokePaintVisible(element) || !this.isStrokeLineVisible(element)) {
            svgElement.setAttribute('stroke', 'none');
            return;
        }

        // Stroke
        const stroke = this.getProperty(element, "strokeBrush");
        if (stroke.animation) {
            this.addBrushAnimation(element, svgElement, "stroke", stroke.animation);
        } else {
            svgElement.setAttribute('stroke', this.getBrush(stroke.value, 'stroke-' + element.id));
        }

        // Stroke width
        const strokeWidth = this.getProperty(element, "strokeLineWidth");
        if (strokeWidth.value !== 1) {
            svgElement.setAttribute('stroke-width', element.strokeLineWidth.toString());
        }
        if (strokeWidth.animation) {
            svgElement.appendChild(this.createAnimation('stroke-width', strokeWidth.animation));
        }

        // Stroke dash array
        const strokeDashArray = this.getProperty(element, "strokeDashArray");
        if (strokeDashArray.value.length > 0) {
            svgElement.setAttribute('stroke-dasharray', strokeDashArray.value.join(' '));
        }
        if (strokeDashArray.animation) {
            const l = strokeDashArray.animation.keyframes.reduce((prev, kf) => leastCommonMultiple(prev, kf.value?.length || 1), 1);
            svgElement.appendChild(this.createAnimation('stroke-dasharray', strokeDashArray.animation, kf => {
                const v = kf.value;
                if (v == null || v.length === 0) {
                    return (new Array(l)).fill(0);
                }
                if (v.length === l) {
                    return v;
                }
                return (new Array(Math.trunc(l / v.length))).fill(v).flat();
            }));
        }

        // Stroke dash offset
        const strokeDashOffset = this.getProperty(element, "strokeDashOffset");
        if (strokeDashOffset.value !== 0) {
            svgElement.setAttribute('stroke-dashoffset', strokeDashOffset.value.toString());
        }
        if (strokeDashOffset.animation) {
            svgElement.appendChild(this.createAnimation('stroke-dashoffset', strokeDashOffset.animation));
        }

        // Stroke opacity
        const strokeOpacity = this.getProperty(element, "strokeOpacity");
        if (strokeOpacity.value !== 1) {
            svgElement.setAttribute('stroke-opacity', strokeOpacity.value.toString());
        }
        if (strokeOpacity.animation) {
            svgElement.appendChild(this.createAnimation('stroke-opacity', strokeOpacity.animation));
        }

        if (element.strokeMiterLimit !== 4) {
            svgElement.setAttribute('stroke-miterlimit', element.strokeMiterLimit.toString());
        }

        if (element.strokeLineCap !== StrokeLineCap.Butt) {
            svgElement.setAttribute('stroke-linecap', this.getLineCap(element.strokeLineCap));
        }

        if (element.strokeLineJoin !== StrokeLineJoin.Miter) {
            svgElement.setAttribute('stroke-linejoin', this.getLineJoin(element.strokeLineJoin));
        }
    }

    addBrushAnimation(element: VectorElement, svgElement: SVGElement, property: string, animation: Animation<Brush>) {
        if (this.brushIsOfType(animation.keyframes, BrushType.Solid)) {
            svgElement.setAttribute(property, this.getBrush(animation.keyframes[0].value, property + '-' + element.id));
            svgElement.appendChild(this.createAnimation(property, animation, k => (k.value as SolidBrush).color.toString()));
        } else if (this.brushIsOfType(animation.keyframes, BrushType.LinearGradient, BrushType.Solid)) {
            this.setLinearGradient(element, svgElement, animation, property);
        } else if (this.brushIsOfType(animation.keyframes, BrushType.RadialGradient, BrushType.Solid)) {
            this.setRadialGradient(element, svgElement, animation, property);
        } else if (this.brushIsOfType(animation.keyframes, BrushType.TwoPointGradient, BrushType.RadialGradient, BrushType.Solid)) {
            this.setTwoPointGradient(element, svgElement, animation, property);
        } else {
            svgElement.setAttribute(property, this.getBrush(animation.keyframes[0].value, property + '-' + element.id));
        }
    }

    addMorphProperty(element: PathNodeElement, svgElement: SVGElement) {
        const nodes = this.getProperty(element, "nodes");

        svgElement.setAttribute("d", Path.nodesToString(nodes.value));

        if (nodes.animation) {
            svgElement.appendChild(this.createAnimation("d", nodes.animation, k => {
                return Path.nodesToString(k.value);
            }));
        }
    }

    setLinearGradient(element: VectorElement, svgElement: SVGElement, animation: Animation<Brush>, property: string): void {
        const keyframes = this.getNormalizedGradientKeyframes(animation);

        const gradient = this.createElement('linearGradient');
        gradient.setAttribute('id', property + '-' + element.id);

        gradient.setAttribute('x1', (keyframes[0].value as LinearGradientBrush).start.x.toString());
        if (!this.hasSameValues(keyframes, (k: Keyframe<LinearGradientBrush>) => k.value.start.x)) {
            gradient.appendChild(this.createKeyframesAnimation('x1', keyframes, k => (k.value as LinearGradientBrush).start.x));
        }
        gradient.setAttribute('y1', (keyframes[0].value as LinearGradientBrush).start.y.toString());
        if (!this.hasSameValues(keyframes, (k: Keyframe<LinearGradientBrush>) => k.value.start.y)) {
            gradient.appendChild(this.createKeyframesAnimation('y1', keyframes, k => (k.value as LinearGradientBrush).start.y));
        }
        gradient.setAttribute('x2', (keyframes[0].value as LinearGradientBrush).end.x.toString());
        if (!this.hasSameValues(keyframes, (k: Keyframe<LinearGradientBrush>) => k.value.end.x)) {
            gradient.appendChild(this.createKeyframesAnimation('x2', keyframes, k => (k.value as LinearGradientBrush).end.x));
        }
        gradient.setAttribute('y2', (keyframes[0].value as LinearGradientBrush).end.y.toString());
        if (!this.hasSameValues(keyframes, (k: Keyframe<LinearGradientBrush>) => k.value.end.y)) {
            gradient.appendChild(this.createKeyframesAnimation('y2', keyframes, k => (k.value as LinearGradientBrush).end.y));
        }

        this.setCommonGradient(gradient, keyframes);
        this.addToDefs(gradient);

        svgElement.setAttribute(property, `url('#${ property + '-' + element.id }')`);
    }

    setRadialGradient(element: VectorElement, svgElement: SVGElement, animation: Animation<Brush>, property: string): void {
        const keyframes = this.getNormalizedGradientKeyframes(animation);

        const gradient = this.createElement('radialGradient');
        gradient.setAttribute('id', property + '-' + element.id);

        gradient.setAttribute('cx', (keyframes[0].value as RadialGradientBrush).center.x.toString());
        if (!this.hasSameValues(keyframes, (k: Keyframe<RadialGradientBrush>) => k.value.center.x)) {
            gradient.appendChild(this.createKeyframesAnimation('cx', keyframes, k => (k.value as RadialGradientBrush).center.x));
        }

        gradient.setAttribute('cy', (keyframes[0].value as RadialGradientBrush).center.y.toString());
        if (!this.hasSameValues(keyframes, (k: Keyframe<RadialGradientBrush>) => k.value.center.y)) {
            gradient.appendChild(this.createKeyframesAnimation('cy', keyframes, k => (k.value as RadialGradientBrush).center.y));
        }

        gradient.setAttribute('r', (keyframes[0].value as RadialGradientBrush).radius.toString());
        if (!this.hasSameValues(keyframes, (k: Keyframe<RadialGradientBrush>) => k.value.radius)) {
            gradient.appendChild(this.createKeyframesAnimation('cx', keyframes, k => (k.value as RadialGradientBrush).radius));
        }

        this.setCommonGradient(gradient, keyframes);
        this.addToDefs(gradient);

        svgElement.setAttribute(property, `url('#${ property + '-' + element.id }')`);
    }

    setTwoPointGradient(element: VectorElement, svgElement: SVGElement, animation: Animation<Brush>, property: string): void {
        const keyframes = this.getNormalizedGradientKeyframes(animation).map(k => {
            if (k.value.type === BrushType.RadialGradient) {
                const g = k.value as RadialGradientBrush;
                k.value = new TwoPointGradientBrush(g.center.shifted(g.radius/2, g.radius/2), g.radius / 4, g.center, g.radius, g.stopColors, g.spread, g.transform);
            }
            return k;
        });

        const gradient = this.createElement('radialGradient');
        gradient.setAttribute('id', property + '-' + element.id);

        gradient.setAttribute('cx', (keyframes[0].value as TwoPointGradientBrush).start.x.toString());
        if (!this.hasSameValues(keyframes, (k: Keyframe<TwoPointGradientBrush>) => k.value.start.x)) {
            gradient.appendChild(this.createKeyframesAnimation('cx', keyframes, k => (k.value as TwoPointGradientBrush).start.x));
        }

        gradient.setAttribute('cy', (keyframes[0].value as TwoPointGradientBrush).start.y.toString());
        if (!this.hasSameValues(keyframes, (k: Keyframe<TwoPointGradientBrush>) => k.value.start.y)) {
            gradient.appendChild(this.createKeyframesAnimation('cy', keyframes, k => (k.value as TwoPointGradientBrush).start.y));
        }

        gradient.setAttribute('r', (keyframes[0].value as TwoPointGradientBrush).startRadius.toString());
        if (!this.hasSameValues(keyframes, (k: Keyframe<TwoPointGradientBrush>) => k.value.startRadius)) {
            gradient.appendChild(this.createKeyframesAnimation('r', keyframes, k => (k.value as TwoPointGradientBrush).startRadius));
        }

        gradient.setAttribute('fx', (keyframes[0].value as TwoPointGradientBrush).end.x.toString());
        if (!this.hasSameValues(keyframes, (k: Keyframe<TwoPointGradientBrush>) => k.value.end.x)) {
            gradient.appendChild(this.createKeyframesAnimation('fx', keyframes, k => (k.value as TwoPointGradientBrush).end.x));
        }

        gradient.setAttribute('fy', (keyframes[0].value as TwoPointGradientBrush).end.y.toString());
        if (!this.hasSameValues(keyframes, (k: Keyframe<TwoPointGradientBrush>) => k.value.end.y)) {
            gradient.appendChild(this.createKeyframesAnimation('fy', keyframes, k => (k.value as TwoPointGradientBrush).end.y));
        }

        gradient.setAttribute('r', (keyframes[0].value as TwoPointGradientBrush).endRadius.toString());
        if (!this.hasSameValues(keyframes, (k: Keyframe<TwoPointGradientBrush>) => k.value.endRadius)) {
            gradient.appendChild(this.createKeyframesAnimation('fr', keyframes, k => (k.value as TwoPointGradientBrush).endRadius));
        }

        this.setCommonGradient(gradient, keyframes);
        this.addToDefs(gradient);

        svgElement.setAttribute(property, `url('#${ property + '-' + element.id }')`);
    }

    setCommonGradient(gradient: SVGElement, keyframes: Keyframe<GradientBrush>[]): void {
        gradient.setAttribute('spreadMethod', this.getSpread(keyframes[0].value.spread));
        if (!this.hasSameValues(keyframes, (k: Keyframe<LinearGradientBrush>) => k.value.spread)) {
            gradient.appendChild(
                this.createKeyframesAnimation('spreadMethod', keyframes, k => this.getSpread((k.value as GradientBrush).spread))
            );
        }
        if (!this.hasSameValues(keyframes, k => ((k.value as GradientBrush).transform || new Matrix()).toString())) {
            gradient.setAttribute('gradientTransform', (keyframes[0].value.transform || new Matrix()).toString());
            gradient.appendChild(
                this.createKeyframesAnimation('gradientTransform', keyframes, k => ((k.value as GradientBrush).transform || new Matrix()).toString())
            );
        } else if (keyframes[0].value.transform && !keyframes[0].value.transform.isIdentity) {
            gradient.setAttribute('gradientTransform', (keyframes[0].value.transform || new Matrix()).toString());
        }
        gradient.setAttribute('gradientUnits', 'userSpaceOnUse');

        this.setStopColors(gradient, keyframes);
    }

    setStopColors(svgElement: SVGElement, keyframes: Keyframe<GradientBrush>[]) {
        const length = keyframes[0].value.stopColors.length;

        for (let i = 0; i < length; i++) {
            const sc = this.createElement('stop');
            sc.setAttribute('stop-color', keyframes[0].value.stopColors.getColorAt(i).toString());
            sc.setAttribute('offset', keyframes[0].value.stopColors.getOffsetAt(i).toString());

            if (!this.hasSameValues(keyframes, (k: Keyframe<GradientBrush>) => k.value.stopColors.getColorAt(i))) {
                sc.appendChild(
                    this.createKeyframesAnimation('stop-color', keyframes, k => (k.value as GradientBrush).stopColors.getColorAt(i).toString())
                );
            }

            if (!this.hasSameValues(keyframes, (k: Keyframe<GradientBrush>) => k.value.stopColors.getOffsetAt(i))) {
                sc.appendChild(
                    this.createKeyframesAnimation('offset', keyframes, k => (k.value as GradientBrush).stopColors.getOffsetAt(i).toString())
                );
            }

            svgElement.appendChild(sc);
        }
    }

    hasSameValues(keyframes: any[], unwrap = v => v): boolean {
        let last = unwrap(keyframes[0]);
        for (let i = 1; i < keyframes.length; i++) {
            const current = unwrap(keyframes[i]);
            if (last !== current) {
                return false;
            }
            last = current;
        }
        return true;
    }

    brushIsOfType(keyframes: Keyframe<any>[], ...type: BrushType[]): boolean {
        for (let i = 0, l = keyframes.length; i < l; i++) {
            if (type.indexOf(keyframes[i].value.type) === -1) {
                return false;
            }
        }
        return true;
    }

    getNextGradient(animation: Animation<Brush>, index: number): GradientBrush {
        for (let i = index; i < animation.keyframes.length; i++) {
            if (animation.keyframes[i].value.type !== BrushType.Solid) {
                return animation.keyframes[i].value as GradientBrush;
            }
        }

        for (let i = index; i >= 0; i--) {
            if (animation.keyframes[i].value.type !== BrushType.Solid) {
                return animation.keyframes[i].value as GradientBrush;
            }
        }

        return undefined;
    }

    getNormalizedGradientKeyframes(animation: Animation<Brush>): Keyframe<GradientBrush>[] {
        let colorStops = 0;

        const keyframes = animation.keyframes.map((k: Keyframe<Brush>) => {
            switch (k.value.type) {
                case BrushType.None:
                case BrushType.ConicalGradient:
                case BrushType.Pointer:
                case BrushType.Pattern:
                    k = k.clone();
                    k.value = new SolidBrush(Color.transparent);
                    break;
                case BrushType.RadialGradient:
                case BrushType.TwoPointGradient:
                case BrushType.LinearGradient:
                    const length = (k.value as GradientBrush).stopColors.length;
                    if (length > colorStops) {
                        colorStops = length;
                    }
                    break;
            }
            return k;
        });

        return keyframes.map((k: Keyframe<Brush>) => {
            if (k.value.type !== BrushType.Solid) {
                const brush = k.value as GradientBrush;
                if (brush.stopColors.length < colorStops) {
                    k = k.clone();
                    const stopColors = brush.stopColors.clone();
                    const last = stopColors.list[stopColors.list.length - 1];
                    while (stopColors.length < colorStops) {
                        stopColors.list.push({color: last.color, offset: last.offset});
                    }
                    k.value = brush.withStopColorList(stopColors);
                }
            }
            return k;
        }).map((k: Keyframe<Brush>, index) => {
            if (k.value.type === BrushType.Solid) {
                const brush = this.getNextGradient(animation, index) as LinearGradientBrush;
                k = k.clone();
                const color = (k.value as SolidBrush).color;
                const stopColors = new StopColorList([
                    {offset: 0, color},
                    {offset: 1, color}
                ]);
                while (stopColors.length < colorStops) {
                    stopColors.list.push({offset: 1, color});
                }
                k.value = brush.withStopColorList(stopColors);
            }
            return k;
        }) as Keyframe<GradientBrush>[];
    }

    getBlendMode(value: BlendMode): string {
        switch (value) {
            case BlendMode.Color:
                return 'color';
            case BlendMode.ColorBurn:
                return 'color-burn';
            case BlendMode.ColorDodge:
                return 'color-dodge';
            case BlendMode.Darken:
                return 'darken';
            case BlendMode.Difference:
                return 'difference';
            case BlendMode.Exclusion:
                return 'exclusion';
            case BlendMode.HardLight:
                return 'hard-light';
            case BlendMode.Hue:
                return 'hue';
            case BlendMode.Lighten:
                return 'lighten';
            case BlendMode.Luminosity:
                return 'luminosity';
            case BlendMode.Multiply:
                return 'multiply';
            case BlendMode.Normal:
                return 'normal';
            case BlendMode.Overlay:
                return 'overlay';
            case BlendMode.Saturation:
                return 'saturation';
            case BlendMode.Screen:
                return 'screen';
            case BlendMode.SoftLight:
                return 'soft-light';
        }
        return 'normal';
    }

    getLineCap(value: StrokeLineCap): string {
        switch (value){
            case StrokeLineCap.Butt:
                return "butt";
            case StrokeLineCap.Round:
                return "round";
            case StrokeLineCap.Square:
                return "square";
        }
    }

    getLineJoin(value: StrokeLineJoin): string {
        switch (value) {
            case StrokeLineJoin.Bevel:
                return "bevel";
            case StrokeLineJoin.Miter:
                return "miter";
            case StrokeLineJoin.Round:
                return "round";
        }
    }

    getSpread(value: SpreadMethod): string {
        switch (value) {
            case SpreadMethod.Pad:
                return "pad";
            case SpreadMethod.Reflect:
                return "reflect";
            case SpreadMethod.Repeat:
                return "repeat";
        }
    }

    getBrush(value: Brush, id: string): string {
        switch (value.type) {
            case BrushType.Solid:
                return (value as SolidBrush).color.toString();
            case BrushType.LinearGradient: {
                const linearGradient = this.createElement('linearGradient');
                let {start, end} = (value as LinearGradientBrush);

                linearGradient.setAttribute('id', id);
                linearGradient.setAttribute('x1', start.x.toString());
                linearGradient.setAttribute('y1', start.y.toString());
                linearGradient.setAttribute('x2', end.x.toString());
                linearGradient.setAttribute('y2', end.y.toString());

                this.setGradient(value as GradientBrush, linearGradient);
                this.addToDefs(linearGradient);
                return 'url(\'#' + id + '\')';
            }
            case BrushType.RadialGradient: {
                const radialGradient = this.createElement('radialGradient');
                let {center, radius} = (value as RadialGradientBrush);

                radialGradient.setAttribute('id', id);
                radialGradient.setAttribute('cx', center.x.toString());
                radialGradient.setAttribute('cy', center.y.toString());
                radialGradient.setAttribute('r', radius.toString());

                this.setGradient(value as GradientBrush, radialGradient);
                this.addToDefs(radialGradient);
                return 'url(\'#' + id + '\')';
            }
            case BrushType.TwoPointGradient: {
                const focalGradient = this.createElement('radialGradient');
                let {start, end, startRadius, endRadius} = (value as TwoPointGradientBrush);

                focalGradient.setAttribute('id', id);
                focalGradient.setAttribute('cx', start.x.toString());
                focalGradient.setAttribute('cy', start.y.toString());
                focalGradient.setAttribute('r', startRadius.toString());
                focalGradient.setAttribute('fx', end.x.toString());
                focalGradient.setAttribute('fy', end.y.toString());
                focalGradient.setAttribute('fr', endRadius.toString());

                this.setGradient(value as GradientBrush, focalGradient);
                this.addToDefs(focalGradient);
                return 'url(\'#' + id + '\')';
            }
        }

        return 'none';
    }

    setGradient(gradient: GradientBrush, svgElement: SVGElement): void {
        for (const stopColor of gradient.stopColors.list) {
            const sc = this.createElement('stop');
            sc.setAttribute('stop-color', stopColor.color.toString());
            sc.setAttribute('offset', (stopColor.offset * 100) + '%');
            svgElement.append(sc);
        }
        svgElement.setAttribute('gradientUnits', 'userSpaceOnUse');
        svgElement.setAttribute('spreadMethod', this.getSpread(gradient.spread));

        if (gradient.transform && !gradient.transform.isIdentity) {
            svgElement.setAttribute('gradientTransform', 'matrix(' + gradient.transform.toString() + ')');
        }
    }

    addChildren(element: Element, svgElement: SVGElement): void {
        if (!element.hasChildren) {
            return;
        }
        for (const child of element.children()) {
            if (!child.hidden && this.isElementCompositionVisible(child) && this.isScaledElementVisible(child)) {
                const svgNode = this.serializeElement(child);
                if (svgNode) {
                    svgElement.append(svgNode);
                }
            }
        }
    }

    serializeDocument(document: AnimationDocument): void {
        this.setCurrentDocument(document);
        this.rootElement.setAttribute('viewBox', '0 0 ' + document.size.width + ' ' +document.size.height);
        if (this.settings.fixedSize) {
            const size = this.settings.size || document.size;
            this.rootElement.setAttribute('width', size.width.toString());
            this.rootElement.setAttribute('height', size.height.toString());
        }
        this.addChildren(document as any, this.rootElement);
    }

    serializeElement(element: Element): SVGElement {
        if (!this.elementMap.has(element.type)) {
            console.error("Unserializable element", element);
            return null;
        }
        return this.elementMap.get(element.type).call(this, element);
    }

    serializeClipPathElement(element: ClipPathElement): SVGElement {
        const clipPath = this.createElement('clipPath');
        clipPath.setAttribute('id', 'clip-' + element.id);
        const path = this.createElement('path');
        this.addMorphProperty(element, path);
        clipPath.appendChild(path);

        this.addToDefs(clipPath);

        const svgElement = this.createElement('g');

        svgElement.setAttribute('id', element.id);
        svgElement.setAttribute('clip-path', "url('#clip-" + element.id + "')");

        this.addBasicProperties(element, svgElement);
        this.addChildren(element, svgElement);

        return svgElement;
    }

    serializeEllipseElement(element: EllipseElement): SVGElement {
        const svgElement = this.createElement('ellipse') as SVGEllipseElement;

        const width = this.getProperty(element, "width");
        const height = this.getProperty(element, "height");

        const rx = width.value / 2, ry = height.value / 2;

        svgElement.setAttribute('cx', '0');
        svgElement.setAttribute('cy', '0');
        svgElement.setAttribute('rx', rx.toString());
        svgElement.setAttribute('ry', ry.toString());

        if (width.animation) {
            svgElement.appendChild(this.createAnimation("rx", width.animation, k => k.value / 2));
            svgElement.appendChild(this.createTransformAnimation('translate', width.animation, () => `${-rx} 0`));
        }
        if (height.animation) {
            svgElement.appendChild(this.createAnimation("ry", height.animation, k => k.value / 2));
            svgElement.appendChild(this.createTransformAnimation('translate', height.animation, () => `0 ${-ry}`));
        }

        this.addBasicProperties(element, svgElement);
        this.addVectorProperties(element, svgElement);
        this.addChildren(element, svgElement);

        return svgElement;
    }

    serializeGroupElement(element: GroupElement): SVGElement {
        const svgElement = this.createElement('g') as SVGGElement;

        this.addChildren(element, svgElement);

        if (!svgElement.hasChildNodes()) {
            return null;
        }

        this.addBasicProperties(element, svgElement);

        return svgElement;
    }

    serializeLineElement(element: LineElement): SVGElement {
        const svgElement = this.createElement('line') as SVGLineElement;

        const points = this.getProperty(element, "points");

        svgElement.setAttribute('x1', points.value[0].x.toString());
        svgElement.setAttribute('y1', points.value[0].y.toString());
        svgElement.setAttribute('x2', points.value[1].x.toString());
        svgElement.setAttribute('y2', points.value[1].y.toString());

        if (points.animation) {
            svgElement.append(
                this.createAnimation("x1", points.animation, k => k.value[0].x),
                this.createAnimation("y1", points.animation, k => k.value[0].y),
                this.createAnimation("x2", points.animation, k => k.value[1].x),
                this.createAnimation("y2", points.animation, k => k.value[1].y),
            );
        }

        this.addBasicProperties(element, svgElement);
        this.addVectorProperties(element, svgElement);
        this.addChildren(element, svgElement);

        return svgElement;
    }

    serializeMaskElement(element: MaskElement): SVGElement {
        return undefined;
    }

    serializePathElement(element: PathElement): SVGElement {
        const svgElement = this.createElement('path') as SVGPathElement;

        this.addBasicProperties(element, svgElement);
        this.addVectorProperties(element, svgElement);
        this.addMorphProperty(element, svgElement);
        this.addChildren(element, svgElement);

        return svgElement;
    }

    serializePolyElement(element: PolyElement): SVGElement {
        const isClosed = element.isClosed;
        const svgElement = this.createElement(isClosed ? 'polygon' : 'polyline');

        const points = this.getProperty(element, "points");

        svgElement.setAttribute('points', points.value.map(p => `${p.x} ${p.y}`).join(', '));

        if (points.animation) {
            svgElement.appendChild(this.createAnimation('points', points.animation, k => k.value.map(p => `${p.x} ${p.y}`).join(', ')));
        }

        this.addBasicProperties(element, svgElement);
        this.addVectorProperties(element, svgElement);
        this.addChildren(element, svgElement);

        return svgElement;
    }

    serializeRectElement(element: RectElement): SVGElement {
        const radius = this.getProperty(element, "radius");

        const isSimple = radius.animation == null ? radius.value.isSimpleValue : (radius.animation as RectRadiusAnimation).isSimple;

        if (!isSimple) {
            // TODO: convert to path return an animated path
            // return null;
        }

        const svgElement = this.createElement('rect') as SVGRectElement;

        const width = this.getProperty(element, "width");
        const height = this.getProperty(element, "height");

        svgElement.setAttribute('width', width.value.toString());
        svgElement.setAttribute('height', height.value.toString());
        if (!radius.value.isZero && radius.value.isSimpleValue) {
            svgElement.setAttribute('rx', radius.value.simpleValue.toString());
            svgElement.setAttribute('ry', radius.value.simpleValue.toString());
        }

        if (width.animation) {
            svgElement.appendChild(this.createAnimation("width", width.animation));
        }
        if (height.animation) {
            svgElement.appendChild(this.createAnimation("height", height.animation));
        }

        if (isSimple && radius.animation && !(radius.animation as RectRadiusAnimation).isZero) {
            const rx = this.createAnimation("rx", radius.animation, k => k.value.simpleValue);
            svgElement.appendChild(rx);

            const ry = rx.cloneNode(true) as SVGElement;
            ry.setAttribute("attributeName", "ry");
            svgElement.appendChild(ry);
        }

        this.addBasicProperties(element, svgElement);
        this.addVectorProperties(element, svgElement);
        this.addChildren(element, svgElement);

        return svgElement;
    }

    serializeRegularPolygonElement(element: RegularPolygonElement): SVGElement {
        return this.serializeShapeElement(element);
    }

    serializeStarElement(element: StarElement): SVGElement {
        return this.serializeShapeElement(element);
    }

    serializeSymbolElement(element: SymbolElement): SVGElement {
        const svgElement = this.createElement('use') as SVGUseElement;

        const width = this.getProperty(element, "width");
        const height = this.getProperty(element, "height");

        svgElement.setAttribute('href', '#' + element.reference);
        svgElement.setAttribute('width', width.value.toString());
        svgElement.setAttribute('height', height.value.toString());

        this.addBasicProperties(element, svgElement);
        this.addChildren(element, svgElement);

        if (width.animation) {
            svgElement.appendChild(this.createAnimation("width", width.animation));
        }
        if (height.animation) {
            svgElement.appendChild(this.createAnimation("height", height.animation));
        }

        return svgElement;
    }

    serializeTextElement(element: TextElement): SVGElement {
        const svgElement = this.createElement('text') as SVGUseElement;

        svgElement.textContent = element.text;

        this.addBasicProperties(element, svgElement);
        this.addVectorProperties(element, svgElement);
        this.addChildren(element, svgElement);

        return svgElement;
    }

    serializeShapeElement(element: ShapeElement<Shape>): SVGElement {
        const svgElement = this.createElement('path') as SVGPathElement;

        svgElement.setAttribute('d', element.localPath.toString());

        this.addBasicProperties(element, svgElement);
        this.addVectorProperties(element, svgElement);
        this.addChildren(element, svgElement);

        return svgElement;
    }
}