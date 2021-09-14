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

import {isMacOS} from "@zindex/canvas-engine";

export type MenuItemDef = {
    title: string,
    disabled?: boolean,
    shortcut?: string[],
    children?: (MenuItemDef | null)[],
    [key: string]: any;
};

const keyMap = isMacOS
    ? {
        'Control': 'Cmd',
        'Alt': 'Option',
        'Delete': '',
    }
    : {
        'Control': 'Ctrl',
        'Delete': ''
    };

export function getKeys(value: string[]): string {
    if (!value) {
        return undefined;
    }
    return value.map(k => k in keyMap ? keyMap[k] : k).join(' + ');
}