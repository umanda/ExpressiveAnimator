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

import {writable} from "svelte/store";
import type {Writable} from "svelte/store";
import type {SnappingOptions} from "@zindex/canvas-engine";

type AsyncGenIdStore = Writable<number> & {
    invalidate(): void;
};

function plusOne(v: number): number {
    return v + 1;
}

export function createGenIdStore(): AsyncGenIdStore {
    const {subscribe, set, update} = writable<number>(0);

    return {
        subscribe,
        set,
        update,
        invalidate(): void {
            update(plusOne)
        }
    }
}

export const AppSettings = {
    settings: {
        layout: {
            theme: 'dark',
            // size of canvas - 75%, timeline 25%
            canvasSizePercent: 75,
            // size of properties -75%, tree 25%
            propertiesSizePercent: 75,
        },
        properties: {
            // global color mode
            colorMode: 'HEX',
            // gradient absolute/relative
            pinnedGradient: true,
            // document size, global size
            proportionalSize: true,
            // transform scale
            proportionalScale: true,
            // stroke dash array & offset
            strokeDashPercent: true,
        },
        timeline: {
            filter: 0,
            follow: false,
        },
        tree: {
            reverse: true,
            follow: false
        },
        canvas: {
            showGuides: true,
            lockGuides: false,
            showRuler: true,
            showGrid: false,
            showGridToBack: false,
            highQuality: true,
            snapping: {
                enabled: false,

                pixel: false,
                grid: false,
                guides: true,

                bounds: true,
                points: false,

                contours: false,
                tolerance: 10,
                view: false
            } as SnappingOptions
        },
    },
    load() {
        const settings = localStorage.getItem("animator-settings");
        if (settings == null) {
            return;
        }

        try {
            this.applySettings(JSON.parse(settings));
        } catch (e) {
            return;
        }
    },
    save() {
        localStorage.setItem("animator-settings", JSON.stringify(this.settings));
    },
    applySettings(src: object, dst: object = this.settings) {
        if (src == null || (typeof src !== "object")) {
            return;
        }
        for (const key of Object.keys(dst)) {
            if (!(key in src)) {
                continue;
            }
            if (dst[key] != null && (typeof dst[key] === "object")) {
                this.applySettings(src[key], dst[key]);
                continue;
            }
            dst[key] = src[key];
        }
    },
}

AppSettings.load();

let timeout: number = null;
function saveGlobalSetting(){
    if (timeout != null) {
        clearInterval(timeout);
        timeout = null;
    }
    setTimeout(AppSettings.save.bind(AppSettings), 300);
}

export function setting<T>(...path: string[]): Writable<T> {
    const key = path.pop();
    let obj = AppSettings.settings;
    for (let i = 0; i < path.length; i++) {
        obj = obj[path[i]];
    }

    const s = writable<T>(obj[key]);

    const isObject = obj[key] != null && (typeof obj[key] === "object");

    return {
        set(value: T) {
            if (isObject || obj[key] !== value) {
                obj[key] = value;
                s.set(value);
                saveGlobalSetting();
            }
        },
        update: s.update,
        subscribe: s.subscribe,
    }
}
