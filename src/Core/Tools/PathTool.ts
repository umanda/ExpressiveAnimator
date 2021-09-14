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

import {PathTool as BasePathTool} from "@zindex/canvas-engine";
import type {CanvasEngine} from "@zindex/canvas-engine";
import {KeyframeCounter} from "./KeyframeCounter";

export class PathTool extends BasePathTool {
    private keyframeCounter: KeyframeCounter = new KeyframeCounter();

    protected hasChanged(engine: CanvasEngine): boolean {
        return this.changed || this.keyframeCounter.hasChanged(engine);
    }

    protected initMold(engine: CanvasEngine) {
        this.keyframeCounter.start(engine);
        super.initMold(engine);
    }

    protected initNodeMove(engine: CanvasEngine) {
        this.keyframeCounter.start(engine);
        super.initNodeMove(engine);
    }

    protected initHandleMove(engine: CanvasEngine, forceSymmetric: boolean) {
        this.keyframeCounter.start(engine);
        super.initHandleMove(engine, forceSymmetric);
    }
}