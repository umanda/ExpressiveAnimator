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
import type {PolyElement} from "@zindex/canvas-engine";
import {VectorAnimators} from "./CommonAnimators";
import {PolyAnimation} from "./CommonAnimations";

export const PolyAnimators: ElementAnimatorMap<PolyElement> = {
    ...(VectorAnimators as ElementAnimatorMap<PolyElement>),
    points: {
        id: 'points',
        title: 'Points',
        type: 'poly',
        create() {
            return new PolyAnimation('points', 'poly');
        }
    }
}
