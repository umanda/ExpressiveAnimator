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

import type {Document, Element} from "@zindex/canvas-engine";
import type {Cloneable, Disposable, WritableKeys, JSONSerializable} from "@zindex/canvas-engine";
import type {Animation} from "./Animation";
import type {Keyframe} from "./Keyframe";
import type {AnimationProject, KeyframeSelection} from "../Project";
import {clamp} from "@zindex/canvas-engine";

export type AnimatedProperties<E extends Element> = {
    [Property in WritableKeys<E>]?: Animation<E[Property]>
}

/**
 * {
 *     [element.id]: {
 *          [property]: Animation
 *     }
 * }
 */
type AnimationMap<T extends Element> = Map<string, AnimatedProperties<T>>;

export enum AnimationMode {
    Normal,
    Loop,
    LoopReverse,
}

type AnimatedValueSetter = <E extends Element, K extends WritableKeys<E>, V extends E[K]>(
    element: E,
    property: K,
    value: V,
    animation: Animation<E[K]>,
    time: number,
    priority?: Set<Keyframe<V>>
) => boolean;

export class DocumentAnimationMap implements Disposable, Cloneable<DocumentAnimationMap>, JSONSerializable {
    private _startTime: number;
    private _endTime: number;
    private _mode: AnimationMode;
    private _map: AnimationMap<any>;

    private _document: Document;

    public constructor(document: Document, startTime: number, endTime: number,
                       mode: AnimationMode = AnimationMode.Normal, animations?: AnimationMap<any>) {
        this._document = document;
        this._startTime = startTime;
        this._endTime = endTime;
        this._mode = mode;
        this._map = animations ?? new Map();
    }

    get isEmpty(): boolean {
        return this._map.size === 0;
    }

    static create(document: Document, project: AnimationProject, json): DocumentAnimationMap {
        let animations = null;

        if (json.animations) {
            const source = project.animatorSource;

            animations = new Map();
            for (const [id, list] of Object.entries(json.animations)) {
                const element = document.getElementById(id);
                if (!element) {
                    continue;
                }
                const properties = {};
                for (const data of (list as Animation<any>[])) {
                    if (data.type != null && data.type !== element.type) {
                        continue;
                    }

                    const animation = source.createAnimation(element, data.property as any);
                    if (!animation) {
                        continue;
                    }

                    // mark as disabled if needed
                    if (data.disabled) {
                        animation.disabled = true;
                    }

                    // add keyframes
                    if (data.keyframes) {
                        animation.keyframes.push(...data.keyframes);
                    }

                    properties[animation.property] = animation;
                }

                if (Object.keys(properties).length > 0) {
                    animations.set(id, properties);
                }
            }
        }

        return new DocumentAnimationMap(document, json.startTime, json.endTime, json.mode, animations);
    }

    toJSON() {
        let animations = null;

        if (this._map.size > 0) {
            animations = {};
            for (const [id, properties] of this._map) {
                animations[id] = Object.values(properties);
            }
        }

        return {
            startTime: this._startTime,
            endTime: this._endTime,
            mode: this._mode,
            animations,
        }
    }

    get document(): Document {
        return this._document;
    }

    get startTime(): number {
        return this._startTime;
    }

    set startTime(value: number) {
        this._startTime = clamp(Math.round(value), 0, this._endTime);
    }

    get endTime(): number {
        return this._endTime;
    }

    set endTime(value: number) {
        this._endTime = clamp(Math.round(value), this._startTime, Number.POSITIVE_INFINITY);
    }

    get duration(): number {
        return this._endTime - this._startTime;
    }

    set duration(value: number) {
        this._endTime = this._startTime + value;
    }

    get mode(): AnimationMode {
        return this._mode;
    }

    set mode(value: AnimationMode) {
        this._mode = value;
    }

    mapTime(time: number): number {
        switch (this._mode) {
            case AnimationMode.Loop:
                time = time % this._endTime;
                break;
            case AnimationMode.LoopReverse:
                // TODO: finish and use animation map time
                break;
        }

        return clamp(time, this._startTime, this._endTime);
    }

    getAnimatedEntries(): IterableIterator<[string, AnimatedProperties<any>]> {
        return this._map.entries();
    }

    * getAllAnimations(): Generator<[string, Animation<any>]> {
        for (const [id, properties] of this._map.entries()) {
            for (const animation of Object.values(properties)) {
                yield [id, animation];
            }
        }
    }

    * getSelectedKeyframes(selection: KeyframeSelection): Generator<{animation: Animation<any>, selected: Keyframe<any>[]}> {
        if (selection.isEmpty || this.isEmpty) {
            return;
        }

        for (const [_, animation] of this.getAllAnimations()) {
            if (animation.disabled) {
                continue;
            }
            const selected = [];
            for (const keyframe of animation.keyframes) {
                if (selection.isKeyframeSelected(keyframe)) {
                    selected.push(keyframe);
                }
            }
            if (selected.length > 0) {
                yield {animation, selected};
            }
        }
    }

    *getAnimatedElements<E extends Element>(): Generator<[E, AnimatedProperties<E>]> {
        let element: E;
        for (const [id, properties] of this._map.entries()) {
            element = this._document.getElementById(id) as E;
            if (element) {
                yield [element, properties];
            }
        }
    }

    updateAnimatedProperty<E extends Element, K extends WritableKeys<E>>(time: number, element: E, property: K, setter: AnimatedValueSetter): boolean {
        if (!this._map.has(element.id)) {
            return false;
        }

        const properties = this._map.get(element.id);
        if (!(property in properties)) {
            return false;
        }

        const animation = properties[property];

        if (animation.disabled) {
            // inform animation is disabled
            return setter(element, property, null, animation, time);
        }

        const value = animation.getValueAtOffset(time);

        if (value === null) {
            // inform animation has no keyframes
            return setter(element, property, null, animation, time);
        }

        // try to update
        return setter(element, property, value, animation, time)
    }

    /**
     * Updates the property values for animated documents
     */
    updateAnimatedProperties(time: number, setter: AnimatedValueSetter, filter?: {animations: Set<Animation<any>>, keyframes?: Set<Keyframe<any>>}): boolean {
        if (this._map.size === 0) {
            return false;
        }

        let updated: boolean = false;

        let element: Element;
        let property;
        let animation: Animation<any>;
        let value: any;

        for (const [id, properties] of this._map.entries()) {
            element = this._document.getElementById(id);
            if (!element) {
                continue;
            }

            for ([property, animation] of Object.entries(properties)) {
                if (filter && !filter.animations.has(animation)) {
                    continue;
                }
                if (animation.disabled) {
                    // inform animation is disabled
                    if (setter(element, property, null, animation, time)) {
                        updated = true;
                    }
                    continue;
                }

                value = animation.getValueAtOffset(time, filter?.keyframes);

                if (value === null) {
                    // inform animation has no keyframes
                    if (setter(element, property, null, animation, time)) {
                        updated = true;
                    }
                    continue;
                }

                // try to update
                if (setter(element, property, value, animation, time, filter?.keyframes)) {
                    updated = true;
                }
            }
        }

        return updated;
    }

    removeEmptyAnimations(callback?: (id: string, property: string) => any): boolean {
        let changed: boolean = false;

        for (const [id, properties] of this._map.entries()) {
            for (const property of Object.keys(properties)) {
                if (!properties[property].hasKeyframes) {
                    delete properties[property];
                    changed = true;
                    if (callback) {
                        callback(id, property);
                    }
                }
            }
            if (Object.keys(properties).length === 0) {
                this._map.delete(id);
            }
        }

        return changed;
    }

    removeSpecificAnimations(element: Element): boolean {
        return false;
    }

    /**
     * Remove animated elements that are no longer present in document
     */
    cleanupAnimatedProperties(): boolean {
        let changed: boolean = false;

        for (const id of this._map.keys()) {
            if (this._document.getElementById(id) == null) {
                this._map.delete(id);
                changed = true;
            }
        }

        return changed;
    }

    clone(document: Document): DocumentAnimationMap {
        return new DocumentAnimationMap(document || this._document, this._startTime, this._endTime, this._mode, this.cloneAnimationMap());
    }

    protected cloneAnimationMap(): AnimationMap<any> {
        const list = new Map();

        for (const [id, properties] of this._map.entries()) {
            const value = {};
            for (const [property, animation] of Object.entries(properties)) {
                value[property] = animation.clone();
            }
            list.set(id, value);
        }

        return list;
    }

    dispose() {
        this._document = null;
        if (this._map) {
            this._map.clear();
            this._map = null;
        }
    }

    getAnimatedProperties<E extends Element>(element: E): AnimatedProperties<E> | null {
        if (element.document !== this._document) {
            return null;
        }
        return this._map.has(element.id) ? this._map.get(element.id) : null;
    }

    removeAnimatedProperties(element: Element, properties?: Iterable<string>): boolean {
        if (element.document !== this._document || !this._map.has(element.id)) {
            return false;
        }
        if (properties == null) {
            this._map.delete(element.id);
            return true;
        }

        const animated = this._map.get(element.id);

        let changed: boolean = false;

        for (const property of properties) {
            if (property in animated) {
                delete animated[property];
                changed = true;
            }
        }

        if (changed && Object.keys(animated).length === 0) {
            this._map.delete(element.id);
        }

        return changed;
    }

    hasAnimatedProperties(element: Element): boolean {
        return this._map.has(element.id);
    }

    isAnimated(element: Element): boolean {
        const properties = this.getAnimatedProperties(element);
        if (properties == null) {
            return false;
        }

        for (const prop in properties) {
            if (properties[prop].isAnimated) {
                return true;
            }
        }

        return false;
    }

    isPropertyAnimated(element: Element, property: string, minKeyframes: number = 0): boolean {
        if (element.document !== this._document || !this._map.has(element.id)) {
            return false;
        }

        const properties = this._map.get(element.id);
        if (!(property in properties)) {
            return false;
        }

        return !properties[property].disabled && properties[property].keyframes.length >= minKeyframes;
    }

    *allAnimations(): Generator<Animation<any>> {
        for (const properties of this._map.values()) {
            for (const animation of Object.values(properties)) {
                yield animation;
            }
        }
    }

    *allKeyframes(): Generator<Keyframe<any>> {
        for (const properties of this._map.values()) {
            for (const animation of Object.values(properties)) {
                for (const keyframe of animation.keyframes) {
                    yield keyframe;
                }
            }
        }
    }

    fixKeyframes(priority: Set<Keyframe<any>>): boolean {
        let changed: boolean = false;

        for (const properties of this._map.values()) {
            for (const animation of Object.values(properties)) {
                if (animation.fixKeyframes(priority)) {
                    changed = true;
                }
            }
        }

        return changed;
    }

    resolveAnimationsAndKeyframes(ids: Set<string>): {animations: Set<Animation<any>>, keyframes: Set<Keyframe<any>>} | null {
        if (ids.size === 0) {
            return null;
        }

        const animations = new Set<Animation<any>>();
        const keyframes = new Set<Keyframe<any>>();

        for (const properties of this._map.values()) {
            for (const animation of Object.values(properties)) {
                let added: boolean = false;
                for (const keyframe of animation.keyframes) {
                    if (ids.has(keyframe.id)) {
                        keyframes.add(keyframe);
                        added = true;
                    }
                }
                if (added) {
                    animations.add(animation);
                }
            }
        }

        return {animations, keyframes};
    }

    getAnimation<E extends Element, P extends  WritableKeys<E>>(element: E, property: P): Animation<E[P]> | null {
        if (element.document !== this._document) {
            return null;
        }

        const properties = this.getAnimatedProperties(element);

        if (properties == null || !(property in properties)) {
            return null;
        }

        return properties[property];
    }

    removeAnimation<E extends Element, P extends  WritableKeys<E>>(element: E, property: P): boolean {
        if (element.document !== this._document) {
            return false;
        }

        const properties = this.getAnimatedProperties(element);

        if (properties == null || !(property in properties)) {
            return false;
        }

        delete properties[property];

        if (Object.keys(properties).length === 0) {
            // Remove empty list
            this.removeAnimatedProperties(element);
        }

        return true;
    }

    copyAnimations<E extends Element>(src: E, dst: E): boolean {
        if (src.type !== dst.type) {
            return false;
        }

        const properties = this.getAnimatedProperties(src);

        if (properties == null) {
            return false;
        }

        let added: boolean = false;

        for (const animation of Object.values(properties) as Animation<any>[]) {
            if (this.addAnimation(dst, animation.clone(true))) {
                added = true;
            }
        }

        return added;
    }

    addAnimation<E extends Element>(element: E, animation: Animation<E[WritableKeys<E>]>): boolean {
        if (element.document !== this._document) {
            return false;
        }

        if (!(animation.property in element) || animation.type != null && animation.type !== element.type) {
            return false;
        }

        let properties: AnimatedProperties<E>;

        if (this._map.has(element.id)) {
            properties = this._map.get(element.id);
        } else {
            properties = {};
            this._map.set(element.id, properties);
        }

        properties[animation.property] = animation;

        return true;
    }

    fitAllKeyframes(start?: number, end?: number): boolean {
        if (start == null) {
            start = this.startTime;
        }

        if (end == null) {
            end = this.endTime;
        }

        let changed: boolean = false;

        const toRemove: string[] = [];

        for (const [id, properties] of this._map.entries()) {
            for (const [property, animation] of Object.entries(properties)) {
                const cut = animation.fit(start, end);
                if (cut === animation) {
                    // nothing happened
                    continue;
                }

                changed = true;

                if (cut == null) {
                    toRemove.push(property);
                    continue;
                }

                properties[property] = cut;
            }

            if (toRemove.length > 0) {
                for (const property in toRemove) {
                    delete properties[property];
                }
                toRemove.splice(0);

                if (Object.keys(properties).length === 0) {
                    this._map.delete(id);
                }
            }
        }

        return changed;
    }
}
