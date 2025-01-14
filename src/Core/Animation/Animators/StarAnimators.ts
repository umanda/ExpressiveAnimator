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
import type {StarElement} from "@zindex/canvas-engine";
import {VectorAnimators} from "./CommonAnimators";
import {NumberAnimation, PositiveNumberAnimation} from "./CommonAnimations";

export const StarAnimators: ElementAnimatorMap<StarElement> = {
    ...(VectorAnimators as ElementAnimatorMap<StarElement>),
    outerRadius: {
        id: 'star-outer-radius',
        title: 'Outer Radius',
        type: 'star',
        create() {
            return new PositiveNumberAnimation('outerRadius', 'star');
        }
    },
    innerRadius: {
        id: 'star-inner-radius',
        title: 'Inner Radius',
        type: 'star',
        create() {
            return new PositiveNumberAnimation('innerRadius', 'star');
        }
    },
    outerCornerRadius: {
        id: 'star-outer-corner-radius',
        title: 'Outer Roundness',
        type: 'star',
        create() {
            return new NumberAnimation('outerCornerRadius', 'star');
        }
    },
    innerCornerRadius: {
        id: 'star-inner-corner-radius',
        title: 'Inner Roundness',
        type: 'star',
        create() {
            return new NumberAnimation('innerCornerRadius', 'star');
        }
    },
    outerRotate: {
        id: 'star-outer-rotate',
        title: 'Outer Rotate',
        type: 'star',
        create() {
            return new NumberAnimation('outerRotate', 'star');
        }
    },
    innerRotate: {
        id: 'star-inner-rotate',
        title: 'Inner Rotate',
        type: 'star',
        create() {
            return new NumberAnimation('innerRotate', 'star');
        }
    },
}
