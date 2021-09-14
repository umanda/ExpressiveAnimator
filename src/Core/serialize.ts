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
    Keyframe,
    LinearEasing, StepEndEasing, StepStartEasing,
    CubicEaseIn, CubicEaseOut, CubicEaseInOut,
    CustomCubicEasing, CustomStepsEasing,
} from "./Animation";
import {AnimationDocument} from "./Project";
import {AnimatedMaskElement, AnimatedSymbolElement} from "./Elements";
import {Serializer, MaskElement, SymbolElement, SingleBoardDocument} from "@zindex/canvas-engine";

Serializer.registerMultiple(
    // we only handle keyframes, animations are created using AnimatorSource
    Keyframe,
    // elements
    AnimatedMaskElement, AnimatedSymbolElement,
    // document
    AnimationDocument,
);

// Easing
Serializer.registerMultiple(
    LinearEasing as any,
    StepStartEasing as any,
    StepEndEasing as any,
    CubicEaseIn as any,
    CubicEaseOut as any,
    CubicEaseInOut as any,
    CustomStepsEasing as any,
    CustomCubicEasing as any,
);

// Alias

Serializer.alias(AnimatedMaskElement, MaskElement);
Serializer.alias(AnimatedSymbolElement, SymbolElement);
Serializer.alias(AnimationDocument, SingleBoardDocument);
