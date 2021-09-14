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

import {Animation} from "../Animation";
import type {Keyframe} from "../Keyframe";
import type {Brush, Cloneable, PathNode, Point, PointStruct, RectShapeRadius} from "@zindex/canvas-engine";
import type {Easing} from "../Easing";
import * as Interpolation from "../Interpolation";

export class NumberAnimation extends Animation<number> {
    constructor(property: string, type: string | null, keyframes: Keyframe<number>[] | null = null, disabled: boolean = false) {
        super(property, type, keyframes, disabled, Interpolation.interpolateNumber);
    }
}

export class PercentAnimation extends Animation<number> {
    constructor(property: string, type: string | null, keyframes: Keyframe<number>[] | null = null, disabled: boolean = false) {
        super(property, type, keyframes, disabled, Interpolation.interpolatePercent);
    }
}

export class PointAnimation extends Animation<Point> {
    constructor(property: string, type: string | null, keyframes: Keyframe<Point>[] | null = null, disabled: boolean = false) {
        super(property, type, keyframes, disabled, Interpolation.interpolatePoint);
    }
}

export class OpacityAnimation extends Animation<number> {
    constructor(property: string, type: string | null, keyframes: Keyframe<number>[] | null = null, disabled: boolean = false) {
        super(property, type, keyframes, disabled, Interpolation.interpolateAlphaComponent);
    }

    get isVisible(): boolean {
        for (const kf of this.keyframes) {
            if (kf.value > 0) {
                return true;
            }
        }
        return false;
    }
}

export class PositiveNumberAnimation extends Animation<number> {
    constructor(property: string, type: string | null, keyframes: Keyframe<number>[] | null = null, disabled: boolean = false) {
        super(property, type, keyframes, disabled, Interpolation.interpolatePositiveNumber);
    }

    get isZero(): boolean {
        for (const kf of this.keyframes) {
            if (kf.value > 0) {
                return false;
            }
        }

        return true;
    }
}

export class BrushAnimation extends Animation<Brush> {
    constructor(property: string, type: string | null, keyframes: Keyframe<Brush>[] | null = null, disabled: boolean = false) {
        super(property, type, keyframes, disabled, Interpolation.interpolateBrush);
    }

    get isVisible(): boolean {
        for (const kf of this.keyframes) {
            if (kf.value.isVisible) {
                return true;
            }
        }
        return false;
    }
}

export class DashArrayAnimation extends Animation<number[]> {
    constructor(property: string, type: string | null, keyframes: Keyframe<number[]>[] | null = null, disabled: boolean = false) {
        super(property, type, keyframes, disabled, Interpolation.interpolateDashArray, dashArrayCopy);
    }
}

export class RectRadiusAnimation extends Animation<RectShapeRadius> {
    constructor(property: string, type: string | null, keyframes: Keyframe<RectShapeRadius>[] | null = null, disabled: boolean = false) {
        super(property, type, keyframes, disabled, Interpolation.interpolateRectRadius, cloneSelf);
    }

    get isZero(): boolean {
        for (const kf of this.keyframes) {
            if (!kf.value.isZero) {
                return false;
            }
        }
        return true;
    }

    get isSimple(): boolean {
        for (const kf of this.keyframes) {
            if (!kf.value.isSimpleValue) {
                return false;
            }
        }
        return true;
    }
}

export class PathNodesAnimation extends Animation<PathNode[]> {
    constructor(property: string, type: string | null, keyframes: Keyframe<PathNode[]>[] | null = null, disabled: boolean = false) {
        super(property, type, keyframes, disabled, Interpolation.interpolatePath, arraySlice);
    }
}

export class PolyAnimation extends Animation<Point[]> {
    constructor(property: string, type: string | null, keyframes: Keyframe<Point[]>[] | null = null, disabled: boolean = false) {
        super(property, type, keyframes, disabled, Interpolation.interpolatePoly, arraySlice);
    }
}

export class LineAnimation extends Animation<[Point, Point]> {
    constructor(property: string, type: string | null, keyframes: Keyframe<[Point, Point]>[] | null = null, disabled: boolean = false) {
        super(property, type, keyframes, disabled, Interpolation.interpolateLine, copyPoint);
    }
}

function copyPoint(value: [Point, Point]): [Point, Point] {
    return [value[0], value[1]];
}

function dashArrayCopy(value: number[]): number[] {
    return value == null ? [] : value.slice();
}

function arraySlice<T>(array: T[]): T[] {
    return array.slice();
}

function cloneSelf<T>(item: Cloneable<T>): T {
    return item.clone();
}
