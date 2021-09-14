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

import {GradientTool as BaseGradientTool} from "@zindex/canvas-engine";
import type {Writable} from "svelte/store";

export class GradientTool extends BaseGradientTool {
    private readonly fillSelectedStore: Writable<boolean>;
    private readonly gradientPinnedStore: Writable<boolean>;

    constructor(fillSelectedStore: Writable<boolean>, gradientPinnedStore: Writable<boolean>) {
        super();
        this.fillSelectedStore = fillSelectedStore;
        this.gradientPinnedStore = gradientPinnedStore;

        fillSelectedStore.subscribe(v => {
            if (this.isFillBrushTargeted !== v) {
                this.isFillBrushTargeted = v;
                this.invalidateToolDrawing();
            }
        });

        gradientPinnedStore.subscribe(v => {
            this.setGradientPinned(v);
        });
    }

    protected targetFillBrush(value: boolean) {
        if (value === this.isFillBrushTargeted) {
            return;
        }
        this.isFillBrushTargeted = value;
        this.invalidateToolDrawing();
        this.fillSelectedStore.set(value);
    }
}