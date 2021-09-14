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

import {Overlay} from "@spectrum-web-components/overlay";
import {isMacOS} from "@zindex/canvas-engine";
import type {Tool as ToolInterface} from "@zindex/canvas-engine";
import {PathTool} from "./Core";
import hotkeys from 'hotkeys-js';
import {CurrentTool, CanvasEngineState, TimelineIsWorking} from "./Stores";
import {
    Project,
    Playing,
    TimelineWorking,
    bringForward,
    bringToFront,
    convertToPath,
    copySelectedElements,
    copySelectedKeyframes,
    cutSelectedElements,
    cutSelectedKeyframes, deleteSelectedElements,
    deleteSelectedKeyframes,
    deselectAllElements,
    duplicateSelectedElements,
    duplicateSelectedKeyframes, showExportDialog,
    groupSelected, showNewProjectDialog,
    reverseSelectedKeyframes, saveProject,
    selectAllElements,
    sendBackward,
    sendToBack,
    unGroupSelected,
    pasteFromClipboard,
    undo,
    redo, showOpenDialog,
    isOverlayOpen,
    isEventOnInput, simplifyPath, fitAllKeyframes, openNewWindow,
} from "./actions";

let Tool: ToolInterface = null;
CurrentTool.subscribe(v => Tool = v);

export function setHotKeysContext(context: 'all' | 'canvas' | 'timeline'): void {
    if (!Playing) {
        //console.log('current keys context: ' + context);
        hotkeys.setScope(context);
    }
}

hotkeys.filter = function (e: KeyboardEvent & { target: HTMLElement }): boolean {
    return (
        // ignore shortcuts when playing
        !Playing &&
        // ignore shortcuts when timeline is working (dragging keyframes)
        !TimelineWorking &&
        // ignore shortcuts when there is no project or current tool is busy
        (Project != null && !Project.middleware.toolIsWorking) &&
        // ignore shortcuts when the active element is an input
        !isEventOnInput(e) &&
        // ignore shortcuts if an overlay is open
        !isOverlayOpen()
    );
};

export function isInput(el: HTMLElement): boolean {
    return el.isContentEditable ||
        (el instanceof HTMLInputElement) ||
        (el instanceof HTMLSelectElement) ||
        (el instanceof HTMLTextAreaElement);
}

function k(shortcut: string): string {
    if (!isMacOS) {
        return shortcut;
    }
    return shortcut
        .replace(/ctrl/g, 'cmd');
}

// file

hotkeys(k('ctrl+n'), () => {
    openNewWindow();
    return false;
});

hotkeys(k('ctrl+p'), () => {
    showNewProjectDialog(Project);
    return false;
});

hotkeys(k('ctrl+o'), () => {
    showOpenDialog(Project);
    return false;
});

hotkeys(k('ctrl+s,ctrl+shift+s'), () => {
    saveProject(Project, hotkeys.shift);
    return false;
});

hotkeys(k('ctrl+e'), () => {
    showExportDialog(Project);
    return false;
});

// undo/redo

hotkeys(k('ctrl+z'), () => {
    undo();
    return false;
});

hotkeys(k('ctrl+shift+z'), () => {
    redo();
    return false;
});

// engine options

function toggleBool(value: boolean): boolean {
    return !value;
}

hotkeys(k('ctrl+r'), () => {
    CanvasEngineState.showRuler.update(toggleBool);
    return false;
});
hotkeys(k("ctrl+'"), () => {
    CanvasEngineState.showGrid.update(toggleBool);
    return false;
});
hotkeys(k("ctrl+alt+'"), () => {
    CanvasEngineState.showGridToBack.update(toggleBool);
    return false;
});
hotkeys(k("ctrl+;"), () => {
    CanvasEngineState.showGuides.update(toggleBool);
    return false;
});
hotkeys(k("ctrl+alt+;"), () => {
    CanvasEngineState.lockGuides.update(toggleBool);
    return false;
});
hotkeys(k("ctrl+,"), () => {
    CanvasEngineState.snapping.update(s => {
        s.enabled = !s.enabled;
        return s;
    });
    return false;
});

// zoom

hotkeys(k('ctrl+='), e => {
    e.preventDefault();
    const engine = Project.engine;
    if (engine) {
        engine.viewBox.zoomIn();
    }
    return false;
});
hotkeys(k('ctrl+-'), e => {
    e.preventDefault();
    const engine = Project.engine;
    if (engine) {
        engine.viewBox.zoomOut();
    }
    return false;
});
hotkeys(k('ctrl+0'), e => {
    e.preventDefault();
    const engine = Project.engine;
    if (engine) {
        engine.viewBox.zoomFit(Project.document.board);
    }
    return false;
});
hotkeys(k('ctrl+9'), e => {
    e.preventDefault();
    const engine = Project.engine;
    if (engine && !engine.selection.isEmpty) {
        engine.viewBox.zoomFit(engine.selection.boundingBox);
    }
    return false;
});
hotkeys(k('ctrl+8'), e => {
    e.preventDefault();
    const engine = Project.engine;
    if (engine && engine.selection.activeElement) {
        engine.viewBox.zoomFit(engine.selection.activeElement.globalBounds.bounds);
    }
    return false;
});

// global paste

hotkeys(k('ctrl+v,ctrl+alt+v'), () => {
    pasteFromClipboard(Project, hotkeys.alt);
    return false;
});

// tools

function changeTool(tool: string) {
    return () => {
        if (Project.engine?.tool?.name !== tool) {
            CurrentTool.change(tool);
            Project.engine.focus();
        }
    }
}

hotkeys('V', changeTool('selection'));
hotkeys('A', changeTool('path'));
hotkeys('F', changeTool('transform'));
hotkeys('P', changeTool('pen'));
hotkeys('R', changeTool('rect'));
hotkeys('E', changeTool('ellipse'));
hotkeys('O', changeTool('regular-polygon'));
hotkeys('S', changeTool('star'));
hotkeys('W', changeTool('poly'));
hotkeys('L', changeTool('line'));
hotkeys('G', changeTool('gradient'));
hotkeys('I', changeTool('color-picker'));
hotkeys('H', changeTool('pan'));
hotkeys('Z', changeTool('zoom'));

// canvas options

const canvasScope = {scope: 'canvas'};

hotkeys(k('ctrl+a'), canvasScope, () => {
    selectAllElements(Project);
    return false;
});
hotkeys(k('ctrl+shift+a'), canvasScope, () => {
    deselectAllElements(Project);
    return false;
});
hotkeys(k('ctrl+g'), canvasScope, () => {
    groupSelected(Project);
    return false;
});
hotkeys(k('ctrl+shift+g'), canvasScope, () => {
    unGroupSelected(Project);
    return false;
});
hotkeys(k('ctrl+shift+up'), canvasScope, () => {
    bringToFront(Project);
    return false;
});
hotkeys(k('ctrl+up'), canvasScope, () => {
    bringForward(Project);
    return false;
});
hotkeys(k('ctrl+shift+down'), canvasScope, () => {
    sendToBack(Project);
    return false;
});
hotkeys(k('ctrl+down'), canvasScope, () => {
    sendBackward(Project);
    return false;
});
hotkeys(k('ctrl+k, ctrl+alt+k'), canvasScope, () => {
    convertToPath(Project, hotkeys.alt);
    return false;
});
hotkeys(k('ctrl+l'), canvasScope, () => {
    simplifyPath(Project);
    return false;
});

hotkeys(k('ctrl+c'), canvasScope, () => {
    copySelectedElements(Project);
    return false;
});
hotkeys(k('ctrl+x'), canvasScope, () => {
    cutSelectedElements(Project);
    return false;
});
hotkeys(k('ctrl+d'), canvasScope, () => {
    duplicateSelectedElements(Project);
    return false;
});
hotkeys('backspace, delete', canvasScope, () => {
    if (Tool instanceof PathTool) {
        if (Project.engine) {
            Tool.deleteSelectedNodes(Project.engine);
        }
    } else {
        deleteSelectedElements(Project);
    }
    return false;
});

// timeline options

const timelineScope = {scope: 'timeline'};

hotkeys(k('ctrl+c'), timelineScope, () => {
    copySelectedKeyframes(Project);
    return false;
});
hotkeys(k('ctrl+x'), timelineScope, () => {
    cutSelectedKeyframes(Project);
    return false;
});
hotkeys(k('ctrl+d,ctrl+alt+d'), timelineScope, () => {
    duplicateSelectedKeyframes(Project, null, hotkeys.alt);
    return false;
});
hotkeys(k('ctrl+i'), timelineScope, () => {
    reverseSelectedKeyframes(Project);
    return false;
});
hotkeys(k('ctrl+f'), timelineScope, () => {
    fitAllKeyframes(Project);
    return false;
});
hotkeys('backspace, delete', timelineScope, () => {
    deleteSelectedKeyframes(Project);
    return false;
});



