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

import type {AnimationProject} from "../AnimationProject";
import {AnimationDocument} from "../AnimationDocument";
import {
    AutomaticGrid,
    BlendMode,
    Brush,
    BrushType,
    ClipPathElement, Color, ConicalGradientBrush, DefaultPen,
    Element,
    EllipseElement,
    EllipseShape,
    EmptyBrush,
    FillRule, Font, FontManager, Grid,
    GroupElement, Guide, GuideList, LinearGradientBrush,
    LineElement,
    LineShape, Matrix,
    Orientation,
    PaintOrder, Path,
    PathElement, PathJoint, PathNode, PathNodeType, Pen,
    Point,
    PolyElement,
    PolyShape, RadialGradientBrush,
    Rectangle,
    RectElement,
    RectShape, RectShapeRadius,
    RegularPolygonElement,
    RegularPolygonShape,
    SolidBrush,
    StarElement,
    StarShape, StopColorList,
    TextElement, TwoPointGradientBrush,
    VectorElement
} from "@zindex/canvas-engine";
import {AnimatedMaskElement, AnimatedSymbolElement} from "../../Elements";
import {DocumentAnimationMap} from "../../Animation";

export default class LegacyImport {
    private readonly project: AnimationProject;

    constructor(project: AnimationProject) {
        this.project = project;
    }

    deserializeDocument(data: any): AnimationDocument {
        const document = new AnimationDocument(new Rectangle(0, 0, data.properties.size.width, data.properties.size.height), data.id);

        document.unit = data.unit || 'px';
        document.title = data.title;
        document.grid = this.deserializeGrid(data.grid);
        document.guides = this.deserializeGuides(data.guides);

        for (const child of data.children) {
            document.appendChild(this.deserializeElement(child));
        }

        document.animation = this.deserializeAnimation(document, data.animation);

        return document;
    }

    deserializeElement(data: any): Element {
        let element: Element = null, isVector = false;

        switch (data.type) {
            case "clip-path":
                element = this.deserializeClipPathElement(data.id, data.properties.clipPath);
                break;
            case "ellipse":
                element = this.deserializeEllipseElement(data.id, data.properties.ellipse);
                isVector = true;
                break;
            case "group":
                element = this.deserializeGroupElement(data.id, data.properties.group);
                break;
            case "mask":
                element = this.deserializeMaskElement(data.id, data.properties.mask);
                break;
            case "path":
                element = this.deserializePathElement(data.id, data.properties.path);
                isVector = true;
                break;
            case "poly":
                element = this.deserializePolyElement(data.id, data.properties.poly);
                isVector = true;
                break;
            case "rect":
                element = this.deserializeRectElement(data.id, data.properties.rect);
                isVector = true;
                break;
            case "regular-polygon":
                element = this.deserializeRegularPolygonElement(data.id, data.properties.regularPolygon);
                isVector = true;
                break;
            case "star":
                element = this.deserializeStarElement(data.id, data.properties.star);
                isVector = true;
                break;
            case "line":
                element = this.deserializeLineElement(data.id, data.properties.line);
                isVector = true;
                break;
            case "symbol":
                element = this.deserializeSymbolElement(data.id, data.properties.symbol);
                break;
            case "text":
                element = this.deserializeTextElement(data.id, data.properties.text);
                isVector = true;
                break;
        }

        if (element === null) {
            throw new Error("Unknown element type '" + data.type + "'");
        }

        element.title = data.title;
        element.locked = data.locked;
        element.hidden = data.hidden;

        this.setElementProperties(element, data.properties.element);

        if (isVector) {
            this.setVectorElementProperties(element as VectorElement, data.properties.vector);
        }

        if (data.children) {
            for (let d of data.children) {
                element.appendChild(this.deserializeElement(d));
            }
        }

        return element;
    }

    setElementProperties(element: Element, properties: any) {
        // we need this addition to properly deserialize ellipse
        // initial anchor is (0, 0) for other elements
        element.anchor = element.anchor.add(this.deserializePoint(properties.anchor));
        element.scale = this.deserializePoint(properties.scale);
        element.position = this.deserializePoint(properties.position);
        element.rotate = properties.rotate;
        element.skewAngle = properties.skewAngle;
        element.skewAxis = properties.skewAxis;
        element.orientation = properties.orientation as Orientation;
        element.opacity = properties.opacity;
        element.blend = properties.blend as BlendMode;
        element.isolate = properties.isolate;
    }

    setVectorElementProperties(element: VectorElement, properties: any): VectorElement {
        element.stroke = this.deserializePen(properties.stroke);
        element.fill = this.deserializeBrush(properties.fill);
        element.fillOpacity = properties.fillOpacity;
        element.strokeOpacity = properties.strokeOpacity;
        element.paintOrder = properties.paintOrder as PaintOrder;
        element.fillRule = properties.fillRule as FillRule;

        return element;
    }

    deserializeClipPathElement(id: string, properties: any): ClipPathElement {
        return new ClipPathElement(this.deserializePath(properties.path), id);
    }

    deserializeEllipseElement(id: string, properties: any): EllipseElement {
        const ellipse = new EllipseElement(new EllipseShape(properties.width, properties.height), id);
        // new ellipse has center at (0,0), fix that with anchor
        ellipse.anchor = new Point(-properties.width / 2, -properties.height / 2);
        return ellipse;
    }

    deserializeGroupElement(id: string, properties: any): GroupElement {
        return new GroupElement(id);
    }

    deserializeMaskElement(id: string, properties: any): AnimatedMaskElement {
        const element: AnimatedMaskElement = new AnimatedMaskElement(properties.reference, id);
        element.time = properties.time;
        return element;
    }

    deserializePathElement(id: string, properties: any): PathElement {
        return new PathElement(this.deserializePath(properties.path), id);
    }

    deserializePolyElement(id: string, properties: any): PolyElement {
        return new PolyElement(new PolyShape(this.deserializePoints(properties.points), properties.isClosed), id);
    }

    deserializeRectElement(id: string, properties: any): RectElement {
        return new RectElement(
            new RectShape(
                properties.width,
                properties.height,
                this.deserializeRectShapeRadius(properties.radius)
            ),
            id
        );
    }

    deserializeRegularPolygonElement(id: string, properties: any): RegularPolygonElement {
        return new RegularPolygonElement(
            new RegularPolygonShape(
                properties.sides,
                properties.radius,
                properties.cornerRadius,
                properties.angle
            ),
            id
        );
    }

    deserializeLineElement(id: string, properties: any): LineElement {
        return new LineElement(
            new LineShape(
                this.deserializePoint(properties.points[0]),
                this.deserializePoint(properties.points[1]),
            ),
            id
        );
    }

    deserializeStarElement(id: string, properties: any): StarElement {
        return new StarElement(
            new StarShape(
                properties.sides,
                properties.outerRadius,
                properties.innerRadius,
                properties.outerCornerRadius,
                properties.innerCornerRadius,
                properties.outerRotate,
                properties.innerRotate,
                properties.angle
            ),
            id
        );
    }

    deserializeSymbolElement(id: string, properties: any): AnimatedSymbolElement {
        const element: AnimatedSymbolElement = new AnimatedSymbolElement(properties.reference, id);
        element.width = properties.width;
        element.height = properties.height;
        element.time = properties.time;
        return element;
    }

    deserializeTextElement(id: string, properties: any): TextElement {
        return new TextElement(properties.text, this.deserializeFont(properties.font), id);
    }

    deserializePoints(data: any[]): Point[] {
        return data.map(this.deserializePoint);
    }

    deserializePoint(data: any): Point {
        return new Point(data.x, data.y);
    }

    deserializeBrush(data: any): Brush {
        switch (data.type as BrushType) {
            case BrushType.None:
                return EmptyBrush.INSTANCE;
            case BrushType.Solid:
                return new SolidBrush(Color.fromCode(data.color));
            case BrushType.LinearGradient:
                return new LinearGradientBrush(
                    this.deserializePoint(data.start),
                    this.deserializePoint(data.end),
                    StopColorList.fromJSON(data.stopColors),
                    data.spread,
                    this.deserializeMatrix(data.transform)
                );
            case BrushType.RadialGradient:
                return new RadialGradientBrush(
                    this.deserializePoint(data.center),
                    data.radius,
                    StopColorList.fromJSON(data.stopColors),
                    data.spread,
                    this.deserializeMatrix(data.transform)
                );
            case BrushType.ConicalGradient:
                return new ConicalGradientBrush(
                    this.deserializePoint(data.center),
                    data.startAngle,
                    data.endAngle,
                    StopColorList.fromJSON(data.stopColors),
                    data.spread,
                    this.deserializeMatrix(data.transform)
                );
            case BrushType.TwoPointGradient:
                return new TwoPointGradientBrush(
                    this.deserializePoint(data.start),
                    data.startRadius,
                    this.deserializePoint(data.end),
                    data.endRadius,
                    StopColorList.fromJSON(data.stopColors),
                    data.spread,
                    this.deserializeMatrix(data.transform)
                );
        }

        throw new Error("Unsupported brush type '" + data.type  + "'");
    }

    deserializePen(data: any): Pen {
        return new DefaultPen(
            this.deserializeBrush(data.brush),
            data.width,
            data.lineCap,
            data.lineJoin,
            data.miterLimit,
            data.dashes,
            data.offset
        );
    }

    deserializePath(data: any): Path {
        return new Path(this.deserializePathNodes(data));
    }

    deserializePathNodes(data: object[]): PathNode[] {
        return data.map(this.deserializePathNode);
    }

    deserializePathNode(data: any): PathNode {
        return new PathNode(
            data.point ? Point.fromObject(data.point) : Point.fromObject(data),
            data.type ?? PathNodeType.Node,
            data.joint ?? PathJoint.Cusp,
            data.handleIn ? Point.fromObject(data.handleIn) : null,
            data.handleOut ? Point.fromObject(data.handleOut) : null,
        );
    }

    deserializeRectShapeRadius(data: any): RectShapeRadius {
        if (typeof data !== "number" && !Array.isArray(data)) {
            // old format
            data = data?.rx || 0;
        }
        return new RectShapeRadius(data);
    }

    deserializeFont(data: any): Font {
        return FontManager.getFont(
            data.family,
            data.style,
            data.weight,
            data.size
        );
    }

    deserializeMatrix(data: any): Matrix {
        if (!data) {
            return null;
        }
        return Matrix.Create(data);
    }

    deserializeAnimation(document, data: any): DocumentAnimationMap {
        const docAnimation = new DocumentAnimationMap(document, data.startTime, data.endTime, data.mode);
        return this.deserializeAnimationList(docAnimation, data.animations)
    }

    deserializeAnimationList(documentAnimation: DocumentAnimationMap, data: any): DocumentAnimationMap {
        let easingDeserializer =  v => v;
        let valueDeserializer = null;

        for (let [elementID, properties] of Object.entries(data)) {
            const element = documentAnimation.document.getElementById(elementID);
            for (let [propertyName, animation] of Object.entries(properties)) {
                switch (animation.type) {
                    case "point":
                        valueDeserializer = this.deserializePoint.bind(this);
                        break;
                    case "brush":
                        valueDeserializer = this.deserializeBrush.bind(this);
                        break;
                    case "path-node":
                        valueDeserializer = this.deserializePathNode.bind(this);
                        break;
                    case "rect-shape-radius":
                        valueDeserializer = this.deserializeRectShapeRadius.bind(this);
                        break;
                    case "path-node-array":
                        valueDeserializer = this.deserializePathNodes.bind(this);
                        break;
                    case "point-array":
                        valueDeserializer = this.deserializePoints.bind(this);
                        break;
                    default:
                        valueDeserializer = v => v;
                }
                const anim = this.project.animatorSource.createAnimation(element, propertyName as any);
                anim.disabled = animation.disabled;
                for (let keyframe of animation.keyframes) {
                    anim.addKeyframe(anim.createKeyframe(valueDeserializer(keyframe.value), keyframe.offset, easingDeserializer(keyframe.easing)));
                }
                documentAnimation.addAnimation(element, anim);
            }
        }

        return documentAnimation;
    }

    deserializeGuides(data: any): GuideList {
        return new GuideList(data.guides.map(g => new Guide(g.position, g.isHorizontal, g.isHidden)));
    }

    deserializeGrid(data: any): Grid {
        if (!data) {
            return null;
        }
        const grid: AutomaticGrid = new AutomaticGrid();
        grid.color = Color.fromCode(data.color);
        grid.horizontalSubdivisions = data.horizontalSubdivisions;
        grid.verticalSubdivisions = data.verticalSubdivisions;
        return grid;
    }
}