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

import type {Easing} from "../Easing"
import {Keyframe} from "../Keyframe";
import {clamp, DEGREES, HandleType, PathJoint, PathNode, PathNodeType, Point} from "@zindex/canvas-engine";
import {Animation} from "../Animation";
import {interpolateMotion} from "../Interpolation";


export class MotionAnimation extends Animation<PathNode> {
    constructor(property: string, type: string | null, keyframes: Keyframe<PathNode>[] | null = null, disabled: boolean = false) {
        super(property, type, keyframes, disabled, interpolateMotion);
    }

    /**
     * Checks if the motion is using only straight lines
     */
    get isPolyLineMotion(): boolean {
        const last = this.keyframes.length - 1;

        let prev = this.keyframes[0].value;
        let current;

        for (let i = 1; i <= last; i++) {
            current = this.keyframes[i].value;
            if (!PathNode.isLinePair(prev, current)) {
                return false;
            }
            prev = current;
        }

        return true;
    }

    /**
     *
     * @param offset
     * @param priority
     */
    getOrientationAtOffset(offset: number, priority?: Set<Keyframe<PathNode>>): number {
        const pair = this.getKeyframePairAtOffset(offset, priority);
        if (pair == null) {
            return 0;
        }
        return PathNode.direction(pair.from, pair.to, clamp(pair.time, 0, 1)) * DEGREES;
    }

    /**
     * @override
     */
    addKeyframeAtOffset(offset: number, value: PathNode | Point | null = null, easing: Easing | null = null): Keyframe<PathNode> {
        if ((value == null) || (value instanceof Point)) {
            const current = this.getKeyframeAtOffset(offset);
            if (current) {
                if (value == null) {
                    return current;
                }
                current.value = current.value.moveTo(value.x, value.y);
                if (easing != null) {
                    current.easing = easing;
                }
                return current;
            }
            return this.addComputedAtOffset(offset, value as Point, easing);
        }

        return super.addKeyframeAtOffset(offset, value as PathNode, easing);
    }

    /**
     * @override
     */
    setKeyframeValue(keyframe: Keyframe<PathNode>, value: PathNode | Point) {
        super.setKeyframeValue(keyframe, this.toPathNode(value, keyframe.value));
    }

    /**
     * @override
     */
    createKeyframe(value: PathNode | Point, offset: number, easing: Easing | null = null): Keyframe<PathNode> {
        if (value instanceof Point) {
            value = this.toPathNode(value);
        }
        return super.createKeyframe(value as PathNode, offset, easing);
    }

    private addComputedAtOffset(offset: number, value: Point | null, easing: Easing | null): Keyframe<PathNode> {
        const last = this.keyframes.length - 1;

        if (last < 0) {
            if (value == null) {
                return null;
            }
            return this.addKeyframe(new Keyframe(this.toPathNode(value), offset, easing));
        }

        if (offset < this.keyframes[0].offset) {
            return this.addKeyframe(new Keyframe(this.toPathNode(value || this.keyframes[0].value.point), offset, easing));
        }

        if (offset > this.keyframes[last].offset) {
            return this.addKeyframe(new Keyframe(this.toPathNode(value || this.keyframes[last].value.point), offset, easing));
        }

        const pair = this.getKeyframePairAtOffset(offset);

        let node: PathNode;
        if (pair == null) {
            if (value == null) {
                node = this.getValueAtOffset(offset);
            } else {
                node = new PathNode(value, PathNodeType.Node, PathJoint.Cusp);
            }
        } else {
            const items = PathNode.createNodeBetween(pair.from, pair.to, pair.time);
            pair.fromKeyframe.value = items[0];
            node = value ? items[1].moveTo(value.x, value.y) : items[1];
            pair.toKeyframe.value = items[2];
        }

        return this.addKeyframe(new Keyframe<PathNode>(node, offset, easing));
    }

    private toPathNode(value: PathNode | Point, prev?: PathNode): PathNode {
        if (value instanceof PathNode) {
            return value;
        }

        if (!prev) {
            return new PathNode(value as Point, PathNodeType.Node, PathJoint.Cusp, null, null);
        }

        return prev.moveTo(value.x, value.y);
    }

    protected addKeyframeToStart(keyframes: Keyframe<PathNode>[], start: number, easing: Easing = null): void {
        const kf = keyframes[0];
        kf.value = kf.value.withoutHandle(HandleType.In);
        keyframes.unshift(new Keyframe<PathNode>(this.toPathNode(kf.value.point), start, easing));
    }

    protected addKeyframeToEnd(keyframes: Keyframe<PathNode>[], end: number, easing: Easing = null): void {
        const kf = keyframes[keyframes.length - 1];
        kf.value = kf.value.withoutHandle(HandleType.Out);
        keyframes.push(new Keyframe<PathNode>(this.toPathNode(kf.value.point), end, easing));
    }
}