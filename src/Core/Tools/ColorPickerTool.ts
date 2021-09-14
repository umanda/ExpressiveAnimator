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

import {ColorPickerTool as BaseColorPickerTool, VectorElement} from "@zindex/canvas-engine";
import type {CanvasEngine, GlobalElementProperties} from "@zindex/canvas-engine";
import type {Writable} from "svelte/store";
import {KeyframeCounter} from "./KeyframeCounter";

export class ColorPickerTool extends BaseColorPickerTool {
    private readonly fillSelectedStore: Writable<boolean>;
    private readonly gradientPinnedStore: Writable<boolean>;
    private readonly keyframeCounter: KeyframeCounter = new KeyframeCounter();
    private readonly onGlobalPropertyChange: () => void;

    constructor(fillSelectedStore: Writable<boolean>, gradientPinnedStore: Writable<boolean>, onGlobalPropertyChange: () => void) {
        super();
        this.fillSelectedStore = fillSelectedStore;
        this.gradientPinnedStore = gradientPinnedStore;
        this.onGlobalPropertyChange = onGlobalPropertyChange;
        fillSelectedStore.subscribe(v => this.isFillSelected = v);
        gradientPinnedStore.subscribe(v => this.isGradientAbsolute = v);
    }

    protected targetFillBrush(value: boolean) {
        this.isFillSelected = value;
        this.fillSelectedStore.set(value);
    }

    protected copyStyleToElements(engine: CanvasEngine, active: VectorElement, hovered: VectorElement): boolean {
        this.keyframeCounter.start(engine);
        return super.copyStyleToElements(engine, active, hovered) || this.keyframeCounter.hasChanged(engine);
    }

    protected copyStyleToElement(engine: CanvasEngine, from: VectorElement | GlobalElementProperties, to: VectorElement | GlobalElementProperties): boolean {
        if (to instanceof VectorElement) {
            this.keyframeCounter.start(engine);
            return super.copyStyleToElement(engine, from, to) || this.keyframeCounter.hasChanged(engine);
        }

        if (super.copyStyleToElement(engine, from, to)) {
            this.onGlobalPropertyChange();
            return true;
        }

        return false;
    }
}
 