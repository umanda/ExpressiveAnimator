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

import type {Easing} from "./Easing";
import type {Cloneable, JSONSerializable} from "@zindex/canvas-engine";
import type {InterpolationFunction} from "./Interpolation";
import {Keyframe} from "./Keyframe";
import {getRangePercent} from "@zindex/canvas-engine";
import {StepEndEasing, StepStartEasing} from "./Easing";

export class Animation<T> implements Cloneable<Animation<T>>, JSONSerializable {
    // Element property
    public readonly property: string;
    // Element type or null if any element type
    public readonly type: string | null;
    public disabled: boolean;
    public readonly keyframes: Keyframe<T>[];
    public readonly interpolate: InterpolationFunction<T>;
    protected readonly copyValue: ((value: T) => T) | null;

    public constructor(
        property: string,
        type: string | null,
        keyframes: Keyframe<T>[] | null = null,
        disabled: boolean = false,
        interpolate: InterpolationFunction<T>,
        copy?: (value: T) => T,
    ) {
        this.property = property;
        this.type = type;
        this.keyframes = keyframes ?? [];
        this.disabled = disabled;
        this.interpolate = interpolate;
        this.copyValue = copy;
    }

    get sortedKeyframes(): Keyframe<T>[] {
        return this.keyframes.slice().sort(sortKeyframes);
    }

    sortKeyframes(): void {
        this.keyframes.sort(sortKeyframes);
    }

    clone(newId?: boolean): Animation<T> {
        let keyframes: Keyframe<T>[];

        if (this.copyValue) {
            keyframes = this.keyframes.map(k => new Keyframe(this.copyValue(k.value), k.offset, k.easing, newId ? null : k.id));
        } else if (newId) {
            keyframes = this.keyframes.map(k => k.clone(true));
        } else {
            keyframes = this.keyframes.map(cloneKeyframe);
        }

        // @ts-ignore
        return new this.constructor(this.property, this.type, keyframes, this.disabled);
    }

    toJSON() {
        return {
            property: this.property,
            type: this.type,
            keyframes: this.keyframes,
            disabled: this.disabled,
        };
    }

    get length(): number {
        return this.keyframes.length;
    }

    get isAnimated(): boolean {
        return !this.disabled && this.keyframes.length > 1;
    }

    get hasKeyframes(): boolean {
        return this.keyframes.length > 0;
    }

    setKeyframeValue(keyframe: Keyframe<T>, value: T): void {
        keyframe.value = this.copyValue ? this.copyValue(value) : value;
    }

    getKeyframeAtIndex(index: number): Keyframe<T> | null {
        return this.keyframes[index] || null;
    }

    removeKeyframeAtIndex(index: number): Keyframe<T> | null {
        const r = this.keyframes.splice(index, 1);
        return r.length > 0 ? r[0] : null;
    }

    addKeyframe(keyframe: Keyframe<T>): Keyframe<T> {
        const offset = keyframe.offset;

        const length = this.keyframes.length;

        for (let i = 0; i < length; i++) {
            const k = this.keyframes[i];
            if (offset === k.offset) {
                return this.keyframes[i] = keyframe;
            }

            if (offset < k.offset) {
                this.keyframes.splice(i, 0, keyframe);
                return keyframe;
            }
        }

        this.keyframes.push(keyframe);

        return keyframe;
    }

    removeKeyframe(keyframe: Keyframe<T>): boolean {
        const index = this.keyframes.indexOf(keyframe);
        if (index !== -1) {
            this.keyframes.splice(index, 1);
            return true;
        }
        return false;
    }

    removeKeyframes(keyframes: Keyframe<T>[]): boolean {
        let index: number, removed: boolean = false;

        for (const k of keyframes) {
            index = this.keyframes.indexOf(k);
            if (index !== -1) {
                this.keyframes.splice(index, 1);
                removed = true;
            }
        }

        return removed;
    }

    getKeyframeAtOffset(offset: number): Keyframe<T> | null {
        const length = this.keyframes.length;

        for (let i = 0; i < length; i++) {
            const k = this.keyframes[i];
            if (offset === k.offset) {
                return k;
            }
            if (k.offset > offset) {
                return null;
            }
        }

        return null;
    }

    fixKeyframes(priority: Set<Keyframe<T>>): boolean {
        let l = this.keyframes.length;
        if (l === 0) {
            return false;
        }

        let prev: Keyframe<T> = this.keyframes[0];
        if (prev.offset < 0) {
            prev.offset = 0;
        }

        let current: Keyframe<T>;
        for (let i = 1; i < l; i++) {
            current = this.keyframes[i];
            if (current.offset < 0) {
                current.offset = 0;
            }

            if (prev.offset === current.offset) {
                if (priority.has(current) || !priority.has(prev)) {
                    this.keyframes.splice(i - 1, 1);
                    prev = current;
                    i--;
                } else {
                    this.keyframes.splice(i, 1);
                }
                l--;
            } else {
                prev = current;
            }
        }

        this.keyframes.sort(sortKeyframes);

        return true;
    }

    getIndexOfKeyframe(keyframe: Keyframe<T>): number {
        return this.keyframes.indexOf(keyframe);
    }

    addKeyframeAtOffset(offset: number, value: T | null, easing: Easing | null = null): Keyframe<T> {
        let keyframe: Keyframe<T> = this.getKeyframeAtOffset(offset);
        if (keyframe != null) {
            // Update existing keyframe
            if (value != null) {
                this.setKeyframeValue(keyframe, value);
            }
            if (easing != null) {
                keyframe.easing = easing;
            }
            return keyframe;
        }

        if (value == null) {
            return this.addKeyframe(new Keyframe<T>(this.getValueAtOffset(offset), offset, easing));
        }

        return this.addKeyframe(this.createKeyframe(value, offset, easing));
    }

    removeKeyframeAtOffset(offset: number): boolean {
        const keyframe = this.getKeyframeAtOffset(offset);
        if (keyframe == null) {
            return false;
        }
        return this.removeKeyframe(keyframe);
    }

    getValueAtOffset(offset: number, priority?: Set<Keyframe<T>>): T {
        if (!priority || this.keyframes.length <= 1) {
            return calcValue<T>(offset, this.keyframes, this.interpolate);
        }

        const keyframes = this.sortedKeyframes;

        let length = keyframes.length;
        let prev = keyframes[0];
        let prevOffset = Math.max(prev.offset, 0);
        if (offset < prevOffset) {
            return this.copyValue ? this.copyValue(prev.value) : prev.value;
        }

        let current;
        let currentOffset;

        for (let i = 1; i < length; i++) {
            current = keyframes[i];
            currentOffset = Math.max(current.offset, 0);

            if (currentOffset === prevOffset) {
                if (priority.has(current) || !priority.has(prev)) {
                    prev = current;
                } else {
                    // if last
                    current = prev;
                }
                continue;
            }

            if (offset === prevOffset) {
                return this.copyValue ? this.copyValue(prev.value) : prev.value;
            }

            if (offset < currentOffset) {
                // Interpolation should handle copy itself
                return this.interpolate(prev.value, current.value, calcPercent(offset, prev, current));
            }

            prevOffset = currentOffset;
            prev = current;
        }

        return this.copyValue ? this.copyValue(current.value) : current.value;
    }

    getNextKeyframe(keyframe: Keyframe<T>): Keyframe<T> | null {
        const index = this.keyframes.indexOf(keyframe);
        if (index < 0 || index + 1 >= this.keyframes.length) {
            return null;
        }
        return this.keyframes[index + 1];
    }

    getPrevKeyframe(keyframe: Keyframe<T>): Keyframe<T> | null {
        const index = this.keyframes.indexOf(keyframe);
        if (index <= 0) {
            return null;
        }
        return this.keyframes[index - 1];
    }

    /**
     * Returns a new animation if keyframes were out of range,
     * otherwise the same instance is returned.
     * If all keyframes were out of range, null is returned.
     */
    fit(start: number, end: number, offsetDelta: number = 1, splitEasing?: boolean): Animation<T> | null {
        if (this.keyframes.length === 0) {
            // no animation
            return null;
        }

        let kf = this.keyframes;
        let last = kf.length - 1;

        if (kf[0].offset > end || kf[last].offset < start) {
            // not in range
            return null;
        }

        if (last === 0) {
            // only one keyframe, nothing to cut
            return this;
        }

        if (kf[0].offset === start && kf[last].offset === end) {
            // all keyframes are ok
            return this;
        }

        // fun part, clone animation

        const animation = this.clone();
        kf = animation.keyframes;

        if (kf[last].offset < end) {
            // expand to right
            const prev = kf[last - 1];
            if ((end - kf[last].offset <= offsetDelta) || (prev.easing instanceof StepStartEasing)) {
                kf[last].offset = end;
            } else {
                kf[last].easing = StepEndEasing.INSTANCE;
                this.addKeyframeToEnd(kf, end, null);
            }
        } else if (kf[last].offset > end) {
            // cut end
            for (let i = last - 1; i >= 0; i--) {
                if (kf[i].offset > end) {
                    continue;
                }

                if (kf[i].offset === end) {
                    // no calc, just remove next
                    kf.splice(i + 1);
                    break;
                }

                if (i + 1 < last) {
                    // remove next keyframes
                    last -= kf.splice(i + 2).length;
                }

                if ((kf[i + 1].offset - end <= offsetDelta) || (kf[i].easing instanceof StepStartEasing)) {
                    // keep the last keyframe, but change offset
                    kf[i + 1].offset = end;
                    break;
                }

                if (end - kf[i].offset <= offsetDelta) {
                    // adjust offset
                    kf[i].offset = end;
                    // remove last keyframe
                    kf.pop();
                    break;
                }

                let easing = kf[i].easing;
                if (splitEasing && easing && last > i) {
                    easing = easing.split(calcPercent(end, kf[i], kf[i + 1]))[0];
                }
                // add end keyframe
                animation.addKeyframeAtOffset(end, null, easing);
                // remove last
                kf.pop();

                break;
            }
        }

        if (kf[0].offset > start) {
            // expand to left
            if ((kf[0].offset - start <= offsetDelta) || (kf[0].easing instanceof StepStartEasing) || (kf[0].easing instanceof StepEndEasing)) {
                kf[0].offset = start;
            } else {
                this.addKeyframeToStart(kf, start, StepStartEasing.INSTANCE);
            }
        } else if (kf[0].offset < start) {
            // might be changed be previous actions
            last = kf.length - 1;
            // cut start
            for (let i = 1; i <= last; i++) {
                if (kf[i].offset < start) {
                    continue;
                }

                if (kf[i].offset === start) {
                    // no calc needed, just remove previous
                    last -= kf.splice(0, i).length;
                    break;
                }

                if (i > 1) {
                    // remove previous
                    last -= kf.splice(0, i - 1).length;
                }

                if (start - kf[0].offset <= offsetDelta) {
                    kf[0].offset = start;
                    break;
                }

                let easing = kf[0].easing;
                if (splitEasing && easing && last > 0) {
                    easing = easing.split(calcPercent(start, kf[0], kf[1]))[1];
                }
                if ((easing instanceof StepStartEasing) || (easing instanceof StepEndEasing)) {
                    // safely drag current keyframe to start
                    kf[0].offset = start;
                } else {
                    // add start keyframe
                    animation.addKeyframeAtOffset(start, null, easing);
                    // remove first
                    kf.shift();
                }

                break;
            }
        }

        return animation;
    }

    protected addKeyframeToStart(keyframes: Keyframe<T>[], start: number, easing: Easing = null): void {
        keyframes.unshift(this.createKeyframe(keyframes[0].value, start, easing));
    }

    protected addKeyframeToEnd(keyframes: Keyframe<T>[], end: number, easing: Easing = null): void {
        keyframes.push(this.createKeyframe(keyframes[keyframes.length - 1].value, end, easing));
    }

    getKeyframePairAtOffset(offset: number, priority?: Set<Keyframe<T>>): KeyframePairInfo<T> | null {
        if (this.keyframes.length <= 1) {
            // no pair available
            return null;
        }

        if (!priority) {
            return calcPairInfo<T>(offset, this.keyframes);
        }

        return calcPriorityPairInfo<T>(offset, this.sortedKeyframes, priority);
    }

    createKeyframe(value: T, offset: number, easing: Easing | null = null): Keyframe<T> {
        return new Keyframe<T>(this.copyValue ? this.copyValue(value) : value, offset, easing);
    }

    * [Symbol.iterator](): Iterator<Keyframe<T>> {
        const length = this.keyframes.length;
        for (let i = 0; i < length; i++) {
            yield this.keyframes[i];
        }
    }
}

function cloneKeyframe<T>(keyframe: Keyframe<T>): Keyframe<T> {
    return keyframe.clone();
}

export function sortKeyframes(a: Keyframe<any>, b: Keyframe<any>): number {
    return a.offset - b.offset;
}

function calcValue<T>(offset: number, keyframes: Keyframe<T>[], interpolate: InterpolationFunction<T>, copy?: (value: T) => T): T {
    const last = keyframes.length - 1;

    if (last === -1) {
        return null;
    }

    if (last === 0 || offset < keyframes[0].offset) {
        return copy ? copy(keyframes[0].value) : keyframes[0].value;
    }

    if (offset >= keyframes[last].offset) {
        return copy ? copy(keyframes[last].value) : keyframes[last].value;
    }

    for (let i = 1; i <= last; i++) {
        if (offset <= keyframes[i].offset) {
            // Interpolation should handle copy itself
            return interpolate(keyframes[i - 1].value, keyframes[i].value, calcPercent<T>(offset, keyframes[i - 1], keyframes[i]));
        }
    }

    return null;
}

function calcPercent<T>(offset: number, from: Keyframe<T>, to: Keyframe<T>): number {
    const percent = getRangePercent(offset, from.offset <= 0 ? 0 : from.offset, to.offset <= 0 ? 0 : to.offset);
    return from.easing ? from.easing.value(percent) : percent;
}

type KeyframePairInfo<T> = {time: number, from: T, to: T, fromKeyframe: Keyframe<T>, toKeyframe: Keyframe<T>};

function getInfo<T>(offset: number, from: Keyframe<T>, to: Keyframe<T>): KeyframePairInfo<T> {
    return {
        time: calcPercent<T>(offset, from, to),
        from: from.value,
        to: to.value,
        fromKeyframe: from,
        toKeyframe: to,
    };
}

function calcPairInfo<T>(offset: number, keyframes: Keyframe<T>[]): KeyframePairInfo<T> | null {
    const last = keyframes.length - 1;

    if (offset <= keyframes[0].offset) {
        return getInfo(offset, keyframes[0], keyframes[1]);
    }

    if (offset < keyframes[last].offset) {
        for (let i = 1; i <= last; i++) {
            if (offset <= keyframes[i].offset) {
                return getInfo(offset, keyframes[i - 1], keyframes[i]);
            }
        }
    }

    return getInfo(offset, keyframes[last - 1], keyframes[last]);
}

function calcPriorityPairInfo<T>(offset: number, keyframes: Keyframe<T>[], priority?: Set<Keyframe<T>>): KeyframePairInfo<T> | null {
    const length: number = keyframes.length;
    let prev: Keyframe<T> = keyframes[0];
    let prevOffset = Math.max(prev.offset, 0);
    let current: Keyframe<T>;
    let currentOffset: number;

    for (let i = 1; i < length; i++) {
        current = keyframes[i];
        currentOffset = Math.max(current.offset, 0);

        if (currentOffset === prevOffset) {
            if (priority.has(current) || !priority.has(prev)) {
                prev = current;
            } else {
                // if last
                current = prev;
            }
            continue;
        }

        if (offset <= currentOffset) {
            break;
        }

        prevOffset = currentOffset;
        prev = current;
    }

    return prev === current ? null : getInfo(offset, prev, current);
}