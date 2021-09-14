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

import {
    Brush,
    BrushType,
    clamp,
    Color,
    ConicalGradientBrush,
    EmptyBrush,
    GradientBrush,
    leastCommonMultiple,
    LinearGradientBrush,
    PathJoint,
    PathNode,
    PathNodeType,
    Point,
    RadialGradientBrush,
    RectShapeRadius,
    round,
    SolidBrush,
    StopColor,
    StopColorList,
    TwoPointGradientBrush
} from "@zindex/canvas-engine";

export type InterpolationFunction<T> = (from: T, to: T, percent: number) => T;

export function interpolateNumber(from: number, to: number, percent: number = 0.5): number {
    return from + percent * (to - from);
}

export function interpolatePositiveNumber(from: number, to: number, percent: number = 0.5): number {
    return Math.max(0, from + percent * (to - from));
}

export function interpolatePercent(from: number, to: number, percent: number = 0.5): number {
    return clamp(interpolateNumber(from, to, percent), 0, 1);
}

export function interpolateColorComponent(from: number, to: number, percent: number = 0.5): number {
    return clamp(Math.round(from + percent * (to - from)), 0, 255);
}

export function interpolateAlphaComponent(from: number, to: number, percent: number = 0.5): number {
    if (from == null) {
        from = 1;
    }
    if (to == null) {
        to = 1;
    }
    return clamp(round(from + percent * (to - from)), 0, 1);
}

export function interpolateDiscrete(from: any, to: any, percent: number = 0.5): any {
    return percent < 0.5 ? from : to;
}

export function interpolatePoint(from: Point, to: Point, percent: number = 0.5): Point {
    return new Point(
        interpolateNumber(from.x, to.x, percent),
        interpolateNumber(from.y, to.y, percent),
    );
}

export function interpolateLine(from: [Point, Point], to: [Point, Point], percent: number = 0.5): [Point, Point] {
    return [
        interpolatePoint(from[0], to[0], percent),
        interpolatePoint(from[1], to[1], percent),
    ];
}

export function interpolatePoly(from: Point[], to: Point[], percent: number = 0.5): Point[] {
    if (from.length !== to.length) {
        return interpolateDiscrete(from, to, percent).slice();
    }

    const list = [];

    const length = from.length;

    for (let i = 0; i < length; i++) {
        list.push(interpolatePoint(from[i], to[i], percent));
    }

    return list;
}

export function interpolateColor(from: Color, to: Color, percent: number = 0.5): Color {
    if (percent <= 0) {
        return from;
    }

    if (percent >= 1) {
        return to;
    }

    return new Color(
        interpolateColorComponent(from.r, to.r, percent),
        interpolateColorComponent(from.g, to.g, percent),
        interpolateColorComponent(from.b, to.b, percent),
        interpolateAlphaComponent(from.a, to.a, percent),
    );
}

const BrushInterpolation = {
    [BrushType.None]: {
        [BrushType.None]: () => EmptyBrush.INSTANCE,
        [BrushType.Solid]: (_, to: SolidBrush, percent: number) => to.withColor(Color.transparent.interpolate(to.color, percent)),
        [BrushType.LinearGradient]: emptyToGradient,
        [BrushType.RadialGradient]: emptyToGradient,
        [BrushType.TwoPointGradient]: emptyToGradient,
        [BrushType.ConicalGradient]: emptyToGradient,
    },
    [BrushType.Solid]: {
        [BrushType.None]: (from: SolidBrush, to: EmptyBrush, percent: number) => from.withColor(from.color.interpolate(Color.transparent, percent)),
        [BrushType.Solid]: interpolateSolidBrush,
        [BrushType.LinearGradient]: solidToGradient,
        [BrushType.RadialGradient]: solidToGradient,
        [BrushType.TwoPointGradient]: solidToGradient,
        [BrushType.ConicalGradient]: solidToGradient,
    },
    [BrushType.LinearGradient]: {
        [BrushType.None]: gradientToEmpty,
        [BrushType.Solid]: gradientToSolid,
        [BrushType.LinearGradient]: interpolateLinearGradient,
        [BrushType.RadialGradient]: interpolateGradients,
        [BrushType.TwoPointGradient]: interpolateGradients,
        [BrushType.ConicalGradient]: interpolateGradients,
    },
    [BrushType.RadialGradient]: {
        [BrushType.None]: gradientToEmpty,
        [BrushType.Solid]: gradientToSolid,
        [BrushType.LinearGradient]: interpolateGradients,
        [BrushType.RadialGradient]: interpolateRadialGradient,
        [BrushType.TwoPointGradient]: interpolateGradients,
        [BrushType.ConicalGradient]: interpolateGradients,
    },
    [BrushType.TwoPointGradient]: {
        [BrushType.None]: gradientToEmpty,
        [BrushType.Solid]: gradientToSolid,
        [BrushType.LinearGradient]: interpolateGradients,
        [BrushType.RadialGradient]: interpolateGradients,
        [BrushType.TwoPointGradient]: interpolateTwoPointGradient,
        [BrushType.ConicalGradient]: interpolateGradients,
    },
    [BrushType.ConicalGradient]: {
        [BrushType.None]: gradientToEmpty,
        [BrushType.Solid]: gradientToSolid,
        [BrushType.LinearGradient]: interpolateGradients,
        [BrushType.RadialGradient]: interpolateGradients,
        [BrushType.TwoPointGradient]: interpolateGradients,
        [BrushType.ConicalGradient]: interpolateConicalGradient,
    },
}

export function interpolateBrush(from: Brush, to: Brush, percent: number = 0.5): Brush {
    if (percent <= 0) {
        return from;
    }

    if (percent >= 1) {
        return to;
    }

    if (BrushInterpolation.hasOwnProperty(from.type) && BrushInterpolation[from.type].hasOwnProperty(to.type)) {
        return BrushInterpolation[from.type][to.type](from, to, percent);
    }

    return interpolateDiscrete(from, to, percent);
}

function colorToStopColorList(color: Color, stops: StopColorList, percent: number): StopColorList {
    return new StopColorList(stops.list.map<StopColor>(stop => ({
        offset: stop.offset,
        color: color.interpolate(stop.color, percent),
    })));
}

function interpolateStopColorList(from: StopColorList, to: StopColorList, percent: number): StopColorList {
    return new StopColorList(interpolateStopColorArray(from.list, to.list, percent));
}

function interpolateStopColorArray(from: StopColor[], to: StopColor[], percent: number): StopColor[] {
    const diff = to.length - from.length;

    if (diff > 0) {
        from = from.slice();
        StopColorList.expandStopColorArray(from, to, diff);
    } else if (diff < 0) {
        to= to.slice();
        StopColorList.expandStopColorArray(to, from, -diff);
    }

    const list: StopColor[] = [];
    const length = from.length;

    for (let i = 0; i < length; i++) {
        list.push({
            offset: interpolatePercent(from[i].offset, to[i].offset, percent),
            color: from[i].color.interpolate(to[i].color, percent),
        });
    }

    return list;
}

function emptyToGradient(from: EmptyBrush, to: GradientBrush, percent: number): GradientBrush {
    return to.withStopColorList(colorToStopColorList(Color.transparent, to.stopColors, percent));
}

function solidToGradient(from: SolidBrush, to: GradientBrush, percent: number): GradientBrush {
    return to.withStopColorList(colorToStopColorList(from.color, to.stopColors, percent));
}

function gradientToEmpty(from: GradientBrush, to: EmptyBrush, percent: number): GradientBrush {
    return from.withStopColorList(colorToStopColorList(Color.transparent, from.stopColors, 1 - percent));
}

function gradientToSolid(from: GradientBrush, to: SolidBrush, percent: number): GradientBrush {
    return from.withStopColorList(colorToStopColorList(to.color, from.stopColors, 1 - percent));
}

function interpolateSolidBrush(from: SolidBrush, to: SolidBrush, percent: number): SolidBrush {
    return from.withColor(from.color.interpolate(to.color, percent));
}

// Different gradient types
function interpolateGradients(from: GradientBrush, to: GradientBrush, percent: number): GradientBrush {
    return (percent < 0.5 ? from : to).withStopColorList(interpolateStopColorList(from.stopColors, to.stopColors, percent));
}

function interpolateLinearGradient(from: LinearGradientBrush, to: LinearGradientBrush, percent: number): LinearGradientBrush {
    return new LinearGradientBrush(
        interpolatePoint(from.start, to.start, percent),
        interpolatePoint(from.end, to.end, percent),
        interpolateStopColorList(from.stopColors, to.stopColors, percent),
        interpolateDiscrete(from.spread, to.spread, percent),
    );
}

function interpolateRadialGradient(from: RadialGradientBrush, to: RadialGradientBrush, percent: number): RadialGradientBrush {
    return new RadialGradientBrush(
        interpolatePoint(from.center, to.center, percent),
        interpolatePositiveNumber(from.radius, to.radius, percent),
        interpolateStopColorList(from.stopColors, to.stopColors, percent),
        interpolateDiscrete(from.spread, to.spread, percent),
    );
}

function interpolateTwoPointGradient(from: TwoPointGradientBrush, to: TwoPointGradientBrush, percent: number): TwoPointGradientBrush {
    return new TwoPointGradientBrush(
        interpolatePoint(from.start, to.start, percent),
        interpolatePositiveNumber(from.startRadius, to.startRadius, percent),
        interpolatePoint(from.end, to.end, percent),
        interpolatePositiveNumber(from.endRadius, to.endRadius, percent),
        interpolateStopColorList(from.stopColors, to.stopColors, percent),
        interpolateDiscrete(from.spread, to.spread, percent),
    );
}

function interpolateConicalGradient(from: ConicalGradientBrush, to: ConicalGradientBrush, percent: number): ConicalGradientBrush {
    return new ConicalGradientBrush(
        interpolatePoint(from.center, to.center, percent),
        interpolatePositiveNumber(from.startAngle, to.startAngle, percent),
        interpolatePositiveNumber(from.endAngle, to.endAngle, percent),
        interpolateStopColorList(from.stopColors, to.stopColors, percent),
        interpolateDiscrete(from.spread, to.spread, percent),
    );
}


export function interpolateDashArray(from: number[], to: number[], percent: number = 0.5): number[] {
    if (percent <= 0) {
        return from.slice();
    }
    if (percent >= 1) {
        return to.slice();
    }

    if (from.length !== to.length) {
        if (from.length === 0) {
            from = (new Array(to.length)).fill(0);
        } else if (to.length === 0) {
            to = (new Array(from.length)).fill(0);
        } else {
            const l = leastCommonMultiple(from.length, to.length);
            from = (new Array(Math.trunc(l / from.length))).fill(from).flat();
            to = (new Array(Math.trunc(l / to.length))).fill(to).flat();
        }
    }

    const list: number[] = [];
    const len = from.length;
    for (let i = 0; i < len; i++) {
        list.push(interpolatePositiveNumber(from[i], to[i], percent));
    }

    return list;
}

export function interpolateRectRadius(from: RectShapeRadius, to: RectShapeRadius, percent: number = 0.5): RectShapeRadius {
    if (percent <= 0) {
        return from.clone();
    }

    if (percent >= 1) {
        return to.clone();
    }

    let f = from.value, t = to.value;
    if (typeof from.value === "number") {
        if (typeof to.value === "number") {
            return new RectShapeRadius(interpolatePositiveNumber(from.value, to.value, percent));
        }
        f = [from.value, from.value, from.value, from.value];
    } else if (typeof to.value === "number") {
        t = [to.value, to.value, to.value, to.value];
    }

    const list = [];
    for (let i = 0; i < 4; i++) {
        list.push(interpolatePositiveNumber(f[i], t[i], percent));
    }
    return new RectShapeRadius(list as any)
}

export function interpolateMotion(from: PathNode, to: PathNode, percent: number = 0.5): PathNode {
    if (percent === 0 || from.equals(to)) {
        return from;
    }
    if (percent === 1) {
        return to;
    }

    const point = PathNode.point(from, to, percent);

    return new PathNode(new Point(point.x, point.y), PathNodeType.Node, PathJoint.Cusp);
}

export function interpolatePathNode(from: PathNode, to: PathNode, percent: number = 0.5): PathNode {
    if (percent <= 0 || from.equals(to)) {
        return from;
    }
    if (percent >= 1) {
        return to;
    }

    const point = interpolatePoint(from.point, to.point, percent);
    const hIn = from.handleIn && to.handleIn ? interpolatePoint(from.handleIn, to.handleIn, percent) : null;
    const hOut = from.handleOut && to.handleOut ? interpolatePoint(from.handleOut, to.handleOut, percent) : null;

    if (percent < 0.5) {
        return new PathNode(point, from.type, from.joint, hIn ?? from.handleIn, hOut ?? from.handleOut);
    }

    return new PathNode(point, to.type, to.joint, hIn ?? to.handleIn, hOut ?? to.handleOut);
}

export function interpolatePath(from: PathNode[], to: PathNode[], percent: number = 0.5): PathNode[] {
    if (percent <= 0) {
        return from.slice();
    }
    if (percent >= 1) {
        return to.slice();
    }

    if (from.length !== to.length) {
        return interpolateDiscrete(from, to, percent).slice();
    }

    const length = from.length;

    const nodes = [];

    for (let i = 0; i < length; i++) {
        nodes.push(interpolatePathNode(from[i], to[i], percent));
    }

    return nodes;
}
