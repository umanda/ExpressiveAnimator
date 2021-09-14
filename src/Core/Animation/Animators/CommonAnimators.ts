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

import type {ElementAnimatorMap} from "../Animator";
import type {Element, VectorElement} from "@zindex/canvas-engine";
import {
    BrushAnimation,
    DashArrayAnimation,
    NumberAnimation,
    OpacityAnimation,
    PointAnimation,
    PositiveNumberAnimation
} from "./CommonAnimations";
import {MotionAnimation} from "./MotionAnimation";

export const ElementAnimators: ElementAnimatorMap<Element> = {
    opacity: {
        id: 'opacity',
        title: 'Opacity',
        create() {
            return new OpacityAnimation('opacity', null);
        }
    }
}

export const TransformAnimators: ElementAnimatorMap<Element> = {
    position: {
        id: 'position',
        title: 'Position',
        //@ts-ignore
        create() {
            return new MotionAnimation('position', null);
        }
    },
    anchor: {
        id: 'anchor',
        title: 'Anchor',
        create() {
            return new PointAnimation('anchor', null);
        }
    },
    rotate: {
        id: 'rotate',
        title: 'Rotate',
        create() {
            return new NumberAnimation('rotate', null);
        }
    },
    scale: {
        id: 'scale',
        title: 'Scale',
        create() {
            return new PointAnimation('scale', null);
        }
    },
    skewAngle: {
        id: 'skew-angle',
        title: 'Skew Angle',
        create() {
            return new NumberAnimation('skewAngle', null);
        }
    },
    skewAxis: {
        id: 'skew-axis',
        title: 'Skew Axis',
        create() {
            return new NumberAnimation('skewAxis', null);
        }
    },
};

export const FillAnimators: ElementAnimatorMap<VectorElement> = {
    fill: {
        id: 'fill',
        title: 'Fill Color',
        create() {
            return new BrushAnimation('fill', null);
        }
    },
    fillOpacity: {
        id: 'fill-opacity',
        title: 'Fill Opacity',
        create() {
            return new OpacityAnimation('fillOpacity', null);
        }
    },
}

export const StrokeAnimators: ElementAnimatorMap<VectorElement> = {
    strokeBrush: {
        id: 'stroke',
        title: 'Stroke Color',
        create() {
            return new BrushAnimation('strokeBrush', null);
        }
    },
    strokeOpacity: {
        id: 'stroke-opacity',
        title: 'Stroke Opacity',
        create() {
            return new OpacityAnimation('strokeOpacity', null);
        }
    },
    strokeLineWidth: {
        id: 'stroke-width',
        title: 'Stroke Width',
        create() {
            return new PositiveNumberAnimation('strokeLineWidth', null);
        }
    },
    strokeDashOffset: {
        id: 'stroke-dash-offset',
        title: 'Dash Offset',
        create() {
            return new NumberAnimation('strokeDashOffset', null);
        }
    },
    strokeDashArray: {
        id: 'stroke-dash-array',
        title: 'Dash Array',
        create() {
            return new DashArrayAnimation('strokeDashArray', null);
        }
    },
};

export const VectorAnimators: ElementAnimatorMap<VectorElement> = {
    ...(ElementAnimators as ElementAnimatorMap<VectorElement>),
    ...(TransformAnimators as ElementAnimatorMap<VectorElement>),
    ...FillAnimators,
    ...StrokeAnimators,
};


