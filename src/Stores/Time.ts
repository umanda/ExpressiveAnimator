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

import {CurrentDocumentAnimation, CurrentProject, CurrentSelection} from "./Project";
import {CurrentTimelineFilterMode, TimelineFilterMode} from "./App";
import {derived, writable} from "svelte/store";
import type {AnimatedProperties, Animation, Animator, AnimatorSource, DocumentAnimationMap} from "../Core";
import type {Element, Selection} from "@zindex/canvas-engine";

const MAX_TIME_SCALE = 1.5;

export const CurrentTime = writable<number>(0);
export const CurrentMaxTime = derived([CurrentDocumentAnimation, CurrentTime],
    ([$animation, $time]) => Math.max($time, $animation ? $animation.endTime : 0) * MAX_TIME_SCALE);

const EMPTY_ARRAY = [];
export const CurrentAnimatedElements = derived(
    [CurrentProject, CurrentDocumentAnimation, CurrentSelection, CurrentTimelineFilterMode],
    ([$project, $animation, $selection, $filter]): AnimatedElement[] => {
        if (!$animation) {
            return EMPTY_ARRAY;
        }

        switch ($filter) {
            case TimelineFilterMode.OnlySelected:
                if ($selection.isEmpty) {
                    return EMPTY_ARRAY;
                }
                return getAnimatedElements(getSelectedElementsProperties($animation, $selection), $project.animatorSource, true);
            case TimelineFilterMode.OnlySelectedAndAnimated:
                if ($selection.isEmpty || $animation.isEmpty) {
                    return EMPTY_ARRAY;
                }
                return getAnimatedElements(getSelectedAndAnimatedElementsProperties($animation, $selection), $project.animatorSource);
            case TimelineFilterMode.OnlyAnimated:
                if ($animation.isEmpty) {
                    return EMPTY_ARRAY;
                }
                return getAnimatedElements($animation.getAnimatedElements(), $project.animatorSource);
            default:
                if ($selection.isEmpty && $animation.isEmpty) {
                    return EMPTY_ARRAY;
                }
                return getAnimatedElements(getSelectedOrAnimatedElementsProperties($animation, $selection), $project.animatorSource, true);
        }
    });

export type AnimatedProperty = {
    animator: Animator<any, any>,
    property: string,
    animation: Animation<any>,
};

export type AnimatedElement = {
    element: Element,
    animatedProperties: AnimatedProperty[],
}

const EMPTY = {};
function *getSelectedElementsProperties(animation: DocumentAnimationMap, selection: Selection<any>): Generator<[Element, AnimatedProperties<Element>]> {
    for (const element of selection) {
        yield [element, animation.getAnimatedProperties(element) || EMPTY];
    }
}

function *getSelectedOrAnimatedElementsProperties(animation: DocumentAnimationMap, selection: Selection<any>): Generator<[Element, AnimatedProperties<Element>]> {
    for (const element of selection) {
        if (!animation.hasAnimatedProperties(element)) {
            yield [element, EMPTY];
        }
    }

    if (!animation.isEmpty) {
        yield * animation.getAnimatedElements();
    }
}

function *getSelectedAndAnimatedElementsProperties(animation: DocumentAnimationMap, selection: Selection<any>): Generator<[Element, AnimatedProperties<Element>]> {
    for (const entry of animation.getAnimatedElements()) {
        if (selection.isSelected(entry[0])) {
            yield entry;
        }
    }
}

function getAnimatedElements(elements: Iterable<[Element, AnimatedProperties<Element>]>, source: AnimatorSource, allowEmpty?: boolean): AnimatedElement[] {
    const list = [];

    for (const [element, properties] of elements) {
        const animatedProperties: AnimatedProperty[] = [];
        for (const [property, animation] of Object.entries(properties)) {
            const animator = source.getAnimator(element, property as any);
            if (!animator) {
                continue;
            }

            animatedProperties.push({
                animator,
                property,
                animation,
            });
        }

        if (allowEmpty || animatedProperties.length > 0) {
            list.push({
                element,
                animatedProperties,
            });
        }
    }

    return list;
}
