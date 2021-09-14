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

export type ToolButtonDef = {
    tool: string,
    icon: string,
    title: string,
    shortcut?: string,
    disabled?: boolean,
};

export type ToolButtons = (ToolButtonDef | ToolButtonDef[])[];

export const buttons: ToolButtons = [
    {
        tool: 'selection',
        icon: 'expr:selection-tool',
        title: 'Selection tool',
        shortcut: 'V',
    },
    {
        tool: 'path',
        icon: 'expr:direct-selection-tool',
        title: 'Node tool',
        shortcut: 'A',
    },
    {
        tool: 'transform',
        icon: 'expr:transform-tool',
        title: 'Transform tool',
        shortcut: 'F',
    },
    {
        tool: 'pen',
        icon: 'expr:pen-tool',
        title: 'Pen tool',
        shortcut: 'P',
    },
    [
        {
            tool: 'rect',
            icon: 'expr:rectangle-tool',
            title: 'Rectangle tool',
            shortcut: 'R',
        },
        {
            tool: 'ellipse',
            icon: 'expr:ellipse-tool',
            title: 'Ellipse tool',
            shortcut: 'E',
        },
        {
            tool: 'regular-polygon',
            icon: 'expr:polygon-tool',
            title: 'Polygon tool',
            shortcut: 'O',
        },
        {
            tool: 'star',
            icon: 'expr:star-tool',
            title: 'Star tool',
            shortcut: 'S',
        },
        {
            tool: 'poly',
            icon: 'expr:polyline-tool',
            title: 'Polyline tool',
            shortcut: 'W',
        },
        {
            tool: 'line',
            icon: 'expr:line-tool',
            title: 'Line tool',
            shortcut: 'L',
        },
    ],
    {
        tool: 'gradient',
        icon: 'expr:gradient-tool',
        title: 'Gradient tool',
        shortcut: 'G',
    },
    {
        tool: 'color-picker',
        icon: 'expr:colorpicker-tool',
        title: 'Eyedropper tool',
        shortcut: 'I',
    },
    /*
    {
        tool: 'text',
        icon: 'expr:text-tool',
        title: 'Text tool (T)',
        disabled: true
    },*/
    {
        tool: 'pan',
        icon: 'expr:pan-tool',
        title: 'Hand tool',
        shortcut: 'H',
    },
    {
        tool: 'zoom',
        icon: 'expr:zoom-tool',
        title: 'Zoom tool',
        shortcut: 'Z',
    },
];

export function getTitle(button: ToolButtonDef): string {
    if (!button.shortcut) {
        return button.title;
    }
    return button.title + ' (' + button.shortcut + ')';
}
