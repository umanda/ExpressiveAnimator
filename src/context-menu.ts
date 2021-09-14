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
import {
    Project,
    IsSaving, Saved,
    ClipboardDataType,
    bringForward,
    bringToFront,
    convertToPath,
    copySelectedElements,
    copySelectedKeyframes,
    cutSelectedElements,
    cutSelectedKeyframes,
    deleteSelectedElements,
    deleteSelectedKeyframes,
    deselectAllElements,
    duplicateSelectedElements,
    duplicateSelectedKeyframes,
    showExportDialog,
    showNewProjectDialog,
    pasteFromClipboard,
    reverseSelectedKeyframes,
    saveProject,
    selectAllElements,
    sendBackward,
    sendToBack,
    showOpenDialog, simplifyPath, delay, showAboutDialog, openNewWindow,
} from "./actions";

function isSelectionEmpty(): boolean {
    return !Project || Project.selection.isEmpty;
}

function emptySelection(item) {
    Object.defineProperty(item, 'disabled', {
        get: isSelectionEmpty,
    });
    return item;
}

function savedProject(item) {
    Object.defineProperty(item, 'disabled', {
        get() {
            return Saved || IsSaving;
        },
    });
    return item;
}

export const canvasContextMenu = [
    emptySelection({
        title: 'Cut',
        shortcut: ['Control', 'X'],
        action: cutSelectedElements,
    }),
    emptySelection({
        title: 'Copy',
        shortcut: ['Control', 'C'],
        action: copySelectedElements,
    }),
    {
        title: 'Paste',
        shortcut: ['Control', 'V'],
        action: pasteFromClipboard,
    },
    emptySelection({
        title: 'Duplicate',
        shortcut: ['Control', 'D'],
        action: duplicateSelectedElements,
    }),
    emptySelection({
        title: 'Delete',
        shortcut: [isMacOS ? 'Backspace' : 'Delete'],
        action: deleteSelectedElements,
    }),
    null,
    emptySelection({
        title: 'Path',
        children: [
            {
                title: 'Convert to path',
                shortcut: ['Control', 'K'],
                action: convertToPath,
            },
            {
                title: 'Simplify path',
                shortcut: ['Control', 'L'],
                action: simplifyPath,
            }
        ],
    }),
    /*
    {
        title: 'Create',
        children: [
            {
                title: 'Clip Path',
                action: () => null,
            },
            {
                title: 'Clip Mask',
                action: () => null,
            },
            {
                title: 'Symbol',
                action: () => null,
            },
        ]
    },
     */
    null,
    emptySelection({
        title: 'Arrange',
        children: [
            {
                title: 'Bring Forward',
                shortcut: ['Control', 'Up'],
                disabled: false,
                action: bringForward,
            },
            {
                title: 'Bring to Front',
                shortcut: ['Shift', 'Control', 'Up'],
                disabled: false,
                action: bringToFront,
            },
            {
                title: 'Send Backward',
                shortcut: ['Control', 'Down'],
                disabled: false,
                action: sendBackward,
            },
            {
                title: 'Send to Back',
                shortcut: ['Shift', 'Control', 'Down'],
                disabled: false,
                action: sendToBack,
            },
        ],
    }),
    {
        title: 'Select',
        children: [
            {
                title: 'All',
                shortcut: ['Control', 'A'],
                disabled: false,
                action: selectAllElements,
            },
            emptySelection({
                title: 'None',
                shortcut: ['Shift', 'Control', 'A'],
                action: deselectAllElements,
            }),
        ]
    }
];

function isKfSelectionEmpty(): boolean {
    return !Project || Project.keyframeSelection.isEmpty;
}

function emptyKfSelection(item) {
    Object.defineProperty(item, 'disabled', {
        get: isKfSelectionEmpty,
    });
    return item;
}

export const timelineContextMenu = [
    emptyKfSelection({
        title: 'Cut',
        shortcut: ['Control', 'X'],
        action: cutSelectedKeyframes,
    }),
    emptyKfSelection({
        title: 'Copy',
        shortcut: ['Control', 'C'],
        action: copySelectedKeyframes,
    }),
    emptySelection({ // we cannot paste when nothing is selected
        title: 'Paste',
        shortcut: ['Control', 'V'],
        disabled: false,
        action: function (project) {
            pasteFromClipboard(project, false, ClipboardDataType.KEYFRAMES);
        },
    }),
    emptyKfSelection({
        title: 'Duplicate',
        shortcut: ['Control', 'D'],
        action: duplicateSelectedKeyframes,
    }),
    emptyKfSelection({
        title: 'Delete',
        shortcut: [isMacOS ? 'Backspace' : 'Delete'],
        action: deleteSelectedKeyframes,
    }),
    null,
    emptyKfSelection({
        title: 'Reverse',
        shortcut: ['Control', 'I'],
        action: reverseSelectedKeyframes,
    }),
];

export const globalMenu = [
    {
        title: 'New Project',
        shortcut: ['Control', 'P'],
        action: async project => {
            await delay(100);
            return showNewProjectDialog(project);
        },
    },
    {
        title: 'New',
        shortcut: ['Control', 'N'],
        action: async () => {
            return openNewWindow();
        },
    },
    {
        title: 'Open',
        shortcut: ['Control', 'O'],
        action: showOpenDialog,
    },
    savedProject({
        title: 'Save',
        shortcut: ['Control', 'S'],
        action: saveProject,
    }),
    {
        title: 'Save as ...',
        shortcut: ['Shift', 'Control', 'S'],
        action: function (project) {
            saveProject(project, true);
        }
    },
    null,
    {
        title: 'Export',
        shortcut: ['Control', 'E'],
        action: showExportDialog,
    },
    null,
    {
        title: 'About',
        action: showAboutDialog,
    }
]
