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

import {GlobalElementProperties} from "@zindex/canvas-engine";
import type {SnappingOptions} from "@zindex/canvas-engine";
import {writable} from "svelte/store";
import {setting} from "./utils";

export const CanvasEngineState = {
    showGuides: setting<boolean>("canvas", "showGuides"),
    lockGuides: setting<boolean>("canvas", "lockGuides"),
    showRuler: setting<boolean>("canvas", "showRuler"),
    showGrid: setting<boolean>("canvas", "showGrid"),
    showGridToBack: setting<boolean>("canvas", "showGridToBack"),
    highQuality: setting<boolean>("canvas", "highQuality"),
    snapping: setting<SnappingOptions>("canvas", "snapping"),
};

export const CurrentCanvasZoom = writable<number>(1);
export const CurrentGlobalElementProperties = new GlobalElementProperties();
