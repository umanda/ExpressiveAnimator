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

import {
    ProjectFileHandle,
    IsProjectSaved,
    notifySelectionChanged,
    CurrentProject,
    IsPlaying, TimelineIsWorking,
    notifyKeyframeSelectionChanged, CurrentTime,
} from "./Stores";
import {ClipPathElement, Element, Exporter, Path, PathElement, Rectangle, Serializer} from "@zindex/canvas-engine";
import {
    AnimatorSource,
    AnimationProject,
    CURRENT_VERSION,
    NativeAnimationExporter,
    NativeAnimationImporter,
    AnimationDocument, DocumentAnimationMap
} from "./Core";
import type {Keyframe} from "./Core";
import {Overlay} from "@spectrum-web-components/overlay";
import type {SvelteComponent} from "svelte";
import {get as getIDB, set as setIDB} from "idb-keyval";
import {SMILAnimationExporter} from "./Core/Project/Format/SMILAnimationExporter";

export let Project: AnimationProject | null = null;
CurrentProject.subscribe(p => Project = p);

export let Playing: boolean = false;
IsPlaying.subscribe(v => Playing = v);

export let TimelineWorking: boolean = false;
TimelineIsWorking.subscribe(v => TimelineWorking = v);

let FileHandle: FileSystemFileHandle = null;
ProjectFileHandle.subscribe(v => FileHandle = v);

export let Saved: boolean = false;
IsProjectSaved.subscribe(v => Saved = v);

export let IsSaving: boolean = false;

export function isBusy(project?: AnimationProject): boolean {
    return Playing || TimelineWorking || IsSaving || (project && project.middleware.toolIsWorking);
}

export type DialogAction = {
    label: string,
    action?: (value?: any) => Promise<any>,
}

export type DialogDef = {
    title: string,
    value?: any,
    mode?: 'fullscreen' | 'fullscreenTakeover' | undefined,
    size?: 's' | 'm' | 'l' | undefined,
    footer?: string,
    dismissable?: boolean,
    divider?: boolean,
    responsive?: boolean,
    underlay?: boolean,
    autofocus?: boolean,

    confirm?: DialogAction,
    secondary?: DialogAction,
    cancel?: DialogAction,
    close?: () => any,
    abort?: () => Promise<void>,
}

export type OpenDialogFunction = (dialog: DialogDef, component: SvelteComponent, props?: object) => void;


// Elements

export function selectAllElements(project: AnimationProject): void {
    if (project.selection.selectMultiple(Array.from(project.document.children()))) {
        project.engine?.invalidate();
        notifySelectionChanged();
    }
}

export function deselectAllElements(project: AnimationProject): void {
    if (project.selection.clear()) {
        project.engine?.invalidate();
        notifySelectionChanged();
    }
}

export function groupSelected(project: AnimationProject): void {
    if (isBusy(project)) {
        return;
    }
    const group = project.middleware.groupSelectedElements();
    if (group) {
        project.state.snapshot();
        project.selection.select(group, false);
        project.engine?.invalidate();
    }
}

export function unGroupSelected(project: AnimationProject, removeGroups: boolean = true): void {
    if (isBusy(project)) {
        return;
    }
    const elements = project.middleware.ungroupElements(project.selection as any, removeGroups);
    if (elements) {
        project.state.snapshot();
        project.selection.selectMultiple(elements);
        project.engine?.invalidate();
        // use this to refresh the tool
        project.engine?.documentChanged();
    }
}

export function bringForward(project: AnimationProject): void {
    if (isBusy(project)) {
        return;
    }
    if (project.middleware.bringForward(project.selection)) {
        project.state.snapshot();
    }
}

export function bringToFront(project: AnimationProject): void {
    if (isBusy(project)) {
        return;
    }
    if (project.middleware.bringToFront(project.selection)) {
        project.state.snapshot();
    }
}

export function sendBackward(project: AnimationProject): void {
    if (isBusy(project)) {
        return;
    }
    if (project.middleware.sendBackward(project.selection)) {
        project.state.snapshot();
    }
}

export function sendToBack(project: AnimationProject): void {
    if (isBusy(project)) {
        return;
    }
    if (project.middleware.sendToBack(project.selection)) {
        project.state.snapshot();
    }
}

export function convertToPath(project: AnimationProject, keepOriginal: boolean = false): void {
    if (isBusy(project)) {
        return;
    }
    if (project.middleware.convertSelectionToPath(keepOriginal)) {
        project.state.snapshot();
    }
}

export function simplifyPath(project: AnimationProject): void {
    if (isBusy(project)) {
        return;
    }
    if (project.middleware.simplifySelectedPaths()) {
        project.state.snapshot();
    }
}

export function deleteSelectedElements(project: AnimationProject): void {
    if (isBusy(project)) {
        return;
    }
    if (project.middleware.deleteSelectedElements(false)) {
        project.state.snapshot();
        project.selection.clear();
        // use this to refresh the tool
        project.engine?.documentChanged();
    }
}

export function duplicateSelectedElements(project: AnimationProject) {
    if (isBusy(project)) {
        return;
    }
    const elements = project.middleware.duplicateSelectedElements();
    if (elements != null && elements.length > 0) {
        project.state.snapshot();
        project.selection.selectMultiple(elements);
    }
}

export enum ClipboardDataType {
    ELEMENTS = "0",
    KEYFRAMES = "1"
}

async function clipboardWrite(data: string, type: ClipboardDataType): Promise<boolean> {
    const blob = new Blob([
        `<expressive-clipboard version="${CURRENT_VERSION.toString().padStart(5, '0')}" type="${type}"><!--`,
        data,
        '--></expressive-clipboard>'
    ], {type: 'text/html'});

    try {
        await navigator.clipboard.write([
            new ClipboardItem({
                [blob.type]: blob
            } as any, {
                presentationStyle: "attachment"
            })
        ]);
        return true;
    } catch (e) {
        console.error(e);
        showToast("Clipboard write failed", "negative");
        return false;
    }
}

type ClipboardData = { blob: Blob, version: number, type: ClipboardDataType };

const CONST_CLIPBOARD_EMPTY = 0;

async function clipboardRead(): Promise<ClipboardData | null | 0> {
    const result = await navigator.permissions.query({name: "clipboard-read" as any});
    if (result.state !== "granted" && result.state !== "prompt") {
        return null;
    }

    const items = await navigator.clipboard.read();

    for (const item of items) {
        if (item.types.includes("text/html")) {
            // length(<expressive-clipboard version="00000" type="0"><!--) = 51
            // length(--></expressive-clipboard>) = 26

            const blob = await item.getType("text/html");

            let part = await blob.slice(0, 100).text();
            const m = /<expressive-clipboard version="(\d+)" type="(\d)">/.exec(part);
            if (m == null) {
                continue;
            }

            const start = m.index + 51;

            part = await blob.slice(-100).text();

            let end = part.indexOf('--></expressive-clipboard>');

            if (end === -1) {
                continue;
            }

            end -= 100;

            return {
                blob: blob.slice(start, end, 'application/json'),
                version: parseInt(m[1]),
                type: m[2] as ClipboardDataType,
            };
        }
    }

    return CONST_CLIPBOARD_EMPTY;
}

export async function pasteFromClipboard(project: AnimationProject, alt?: boolean, type?: ClipboardDataType): Promise<boolean> {
    if (isBusy(project)) {
        return false;
    }

    let data;
    try {
        data = await clipboardRead();
    } catch (e) {
        if ((e instanceof DOMException) && e.name === "NotAllowedError") {
            data = null;
        } else {
            data = CONST_CLIPBOARD_EMPTY;
        }
    }

    if (data == null) {
        showToast("Clipboard access was denied", "negative");
        return false;
    }

    if (data === CONST_CLIPBOARD_EMPTY || (type != null && data.type !== type)) {
        showToast("Clipboard is empty");
        return false;
    }

    if (data.type === ClipboardDataType.KEYFRAMES && project.selection.isEmpty) {
        showToast("Cannot paste keyframes because no element is selected");
        return false;
    }

    let obj;

    try {
        obj = Serializer.deserialize(await data.blob.text(), data.version.toString(), project);
    } catch (e) {
        console.error(e);
        showToast("Clipboard contains corrupted data", "negative");
        return false;
    }

    if (obj == null) {
        showToast("Clipboard is empty");
        return false;
    }

    switch (data.type) {
        case ClipboardDataType.ELEMENTS:
            if (!pasteElements(project, obj.elements, obj.animations)) {
                showToast("No elements pasted");
                return false;
            }
            return true;
        case ClipboardDataType.KEYFRAMES:
            if (!pasteKeyframes(project, obj.keyframes, alt)) {
                showToast("No keyframes can be added to the selected elements");
                return false;
            }
            return true;
    }

    return true;
}

function pasteElements(project: AnimationProject, elements: Element[], animations?: { [id: string]: any[] } | null): boolean {
    if (elements == null || !elements.length) {
        return false;
    }

    const map = project.document.regenerateElementId(...elements);

    let inserted: Element[] = [];

    for (let element of elements) {
        element.title = project.middleware.getElementTitle(element) + ' (copy)';

        if (!project.document.appendChild(element)) {
            map.delete(element.id);
            continue;
        }

        inserted.push(element);
    }

    const inverseMap = new Map();
    for (const [key, value] of map) {
        if (value != null) {
            inverseMap.set(value, key);
        }
    }

    map.clear();

    if (inserted.length > 0 && animations != null && inverseMap.size > 0) {
        for (let [id, list] of Object.entries(animations)) {
            if (!inverseMap.has(id)) {
                continue;
            }
            id = inverseMap.get(id);
            const element = project.document.getElementById(id);
            if (!element) {
                continue;
            }
            for (const item of list) {
                const animation = project.animatorSource.createAnimation(element, item.property as any);
                if (animation) {
                    if (item.disabled) {
                        animation.disabled = true;
                    }
                    if (item.keyframes) {
                        animation.keyframes.push(...item.keyframes);
                    }
                    project.document.animation.addAnimation(element, animation);
                }
            }
        }
    }

    if (inserted.length === 0) {
        return false;
    }

    project.middleware.updateAnimatedProperties(project.document);
    project.selection.selectMultiple(inserted);
    project.state.snapshot();
    project.engine?.invalidate();

    return true;
}

function pasteKeyframes(project: AnimationProject, keyframes: Map<string, Map<string, Keyframe<any>[]>>, reverse?: boolean): boolean {
    const selection = project.selection;

    if (reverse) {
        for (const types of keyframes.values()) {
            for (const kf of types.values()) {
                project.middleware.reverseKeyframes(kf);
            }
        }
    }

    const generalKeyframes = keyframes.has("*") ? keyframes.get("*") : null;

    let added: Keyframe<any>[] = [];
    const time = project.time;
    const animationMap = project.document.animation;
    const source = project.animatorSource;

    const addKeyframes = (element: Element, map: Map<string, Keyframe<any>[]>) => {
        for (const [property, keyframes] of map) {
            if (property === 'nodes' && ((element instanceof PathElement) || (element instanceof ClipPathElement))) {
                if (!Path.canInterpolateNodes(element.nodes, keyframes[0].value)) {
                    // we cannot not add this path
                    continue;
                }
            }

            let animation = animationMap.getAnimation(element, property as any);
            if (animation == null) {
                animation = source.createAnimation(element, property as any);
                if (animation == null) {
                    continue;
                }
                animationMap.addAnimation(element, animation);
            }

            for (let kf of keyframes) {
                kf = kf.clone(true);
                kf.offset += time;
                added.push(animation.addKeyframe(kf));
            }
        }
    }

    for (const element of selection) {
        if (generalKeyframes) {
            addKeyframes(element, generalKeyframes);
        }
        if (keyframes.has(element.type)) {
            addKeyframes(element, keyframes.get(element.type));
        }
    }

    if (added.length === 0) {
        return false;
    }

    project.middleware.updateAnimatedProperties(project.document);
    project.keyframeSelection.selectMultipleKeyframes(added);
    project.state.snapshot();
    project.engine?.invalidate();

    notifyKeyframeSelectionChanged();

    return true;
}

export async function copySelectedElements(project: AnimationProject): Promise<boolean> {
    if (isBusy(project) || project.selection.isEmpty) {
        return;
    }

    const animationMap = project.document.animation;

    let animations = {};
    const elements = Serializer.serialize(project.middleware.sortElementsInTreeOrder(project.document, Array.from(project.selection)), (original, json) => {
        if ((original instanceof Element) && animationMap.isAnimated(original)) {
            animations[original.id] = Object.values(animationMap.getAnimatedProperties(original));
        }
    });

    if (Object.keys(animations).length === 0) {
        animations = 'null';
    } else {
        animations = Serializer.serialize(animations);
    }

    // TODO: assets
    return clipboardWrite(`{"elements": ${elements}, "animations": ${animations}}`, ClipboardDataType.ELEMENTS);
}

export async function cutSelectedElements(project: AnimationProject) {
    if (isBusy(project)) {
        return;
    }
    await copySelectedElements(project);
    deleteSelectedElements(project);
}

// Timeline

export function deleteSelectedKeyframes(project: AnimationProject) {
    if (isBusy(project)) {
        return;
    }
    if (project.middleware.deleteSelectedKeyframes()) {
        project.middleware.updateAnimatedProperties(project.document);
        project.state.snapshot();
        project.engine?.invalidate();
    }
}

export function duplicateSelectedKeyframes(project: AnimationProject, offset?: number, reverse?: boolean) {
    if (isBusy(project)) {
        return;
    }
    if (project.middleware.duplicateSelectedKeyframes(offset, reverse)) {
        project.state.snapshot();
    }
}

export function reverseSelectedKeyframes(project: AnimationProject) {
    if (isBusy(project)) {
        return;
    }
    if (project.middleware.reverseSelectedKeyframes()) {
        project.state.snapshot();
    } else {
        showToast("Current keyframe selection is not reversible");
    }
}

export function fitAllKeyframes(project: AnimationProject) {
    if (isBusy(project)) {
        return;
    }
    if (project.middleware.fitAllKeyframes()) {
        project.state.snapshot();
    }
}

export async function copySelectedKeyframes(project: AnimationProject): Promise<boolean> {
    if (isBusy(project)) {
        return;
    }
    const keyframes = project.middleware.mergeSelectedKeyframes();
    if (keyframes.size === 0) {
        return false;
    }
    return clipboardWrite(`{"keyframes": ${Serializer.serialize(keyframes)}}`, ClipboardDataType.KEYFRAMES);
}

export async function cutSelectedKeyframes(project: AnimationProject) {
    if (isBusy(project)) {
        return;
    }
    await copySelectedKeyframes(project);
    deleteSelectedKeyframes(project);
}

export function undo(): boolean {
    if (!Project || isBusy(Project)) {
        return false;
    }
    return Project.state.undo();
}

export function redo(): boolean {
    if (!Project || isBusy(Project)) {
        return false;
    }
    return Project.state.redo();
}

// global
declare global {
    interface Window {
        showOpenFilePicker(options?: any): Promise<FileSystemFileHandle[]>;

        showSaveFilePicker(options?: any): Promise<FileSystemFileHandle>;
    }
}

export async function showOpenDialog(current: AnimationProject = Project): Promise<AnimationProject | null> {
    if (isBusy(current)) {
        return null;
    }

    if (!Saved && current) {
        await showSaveAlert(current);
    }

    try {
        return await openProject(current);
    } catch (e) {
        showToast("Invalid project file", "negative");
    }

    return null;
}

export async function openRecentProject(handle: FileSystemFileHandle) {
    if (!(await verifyFilePermission(handle))) {
        return null;
    }

    return openProjectInternal(handle, Project);
}

async function verifyFilePermission(handle: FileSystemFileHandle): Promise<boolean> {
    const options = {
        mode: 'readwrite'
    } as any;

    // Check if permission was already granted. If so, return true.
    if ((await handle.queryPermission(options)) === 'granted') {
        return true;
    }

    // Request permission. If the user grants permission, return true.
    if ((await handle.requestPermission(options)) === 'granted') {
        return true;
    }

    // The user didn't grant permission, so return false.
    return false;
}

async function showSaveAlert(current: AnimationProject = Project): Promise<void> {
    return showDialog('save', {
        title: "Save Project",
        dismissable: false,
        divider: true,
        size: "m",
        confirm: {
            label: "Save Project",
            action: async () => {
                if (!(await saveProjectInternal(current))) {
                    throw new Error("Failed to save project");
                }
            }
        },
        cancel: {
            label: "Discard changes",
        },
    });
}

export async function openNewWindow() {
    window.open(window.location.href, '_blank', 'resizable');
}

export async function showNewProjectDialog(current: AnimationProject = Project) {
    if (!Saved && current) {
        await showSaveAlert(current);
    }

    const deferPrompt = window['expressiveBeforeInstallPrompt'];
    let pwa = !window.matchMedia('(display-mode: standalone)').matches;
    if (pwa) {
        pwa = !!deferPrompt;
    }

    await showDialog('new-project', {
        title: '',
        dismissable: true,
        divider: false,
        size: 'l',
        responsive: true,
        autofocus: false,
    }, {
        pwa,
        recent: await readRecentProjectEntries(),
        deferPrompt
    });
}

export async function showAboutDialog() {
    await showDialog('about', {
        title: '',
        dismissable: true,
        divider: false,
        size: 'm',
        responsive: true,
        autofocus: false,
    }, {
        version: CURRENT_VERSION
    });
}

export async function showAddDocumentDialog(): Promise<void> {
    // return showDialog(null, {
    //     title: "Add Document",
    //     dismissable: true,
    //     divider: true,
    //     size: "l",
    //     // confirm: {
    //     //     label: "Save Project",
    //     //     action: async () => {
    //     //         if (!(await saveProject(current))) {
    //     //             throw new Error("Failed to save project");
    //     //         }
    //     //     }
    //     // },
    //     // cancel: {
    //     //     label: "Discard changes",
    //     // },
    // });
}


const EAFileTypes = [
    {
        description: 'Expressive Animator Files',
        startIn: 'documents',
        accept: {
            'expressive/animation': ['.eaf'],
            'text/*': ['.eaf'],
        }
    }
];

export async function openProject(current: AnimationProject = Project): Promise<AnimationProject | null> {
    let fileHandle: FileSystemFileHandle;

    try {
        [fileHandle] = await window.showOpenFilePicker({
            id: 'openProject',
            multiple: false,
            // excludeAcceptAllOption: true,
            types: EAFileTypes,
        });
    } catch (e) {
        return null;
    }

    if (!fileHandle) {
        return null;
    }

    let project: AnimationProject = null;

    await showLoadingDialog("Opening project...", async () => {
        try {
            project = await openProjectInternal(fileHandle, current);
            await delay(1000);
        } catch (e) {
            showToast("Failed to open project", "negative");
        }
    });

    return project;
}

async function openProjectInternal(fileHandle: FileSystemFileHandle, current?: AnimationProject): Promise<AnimationProject | null> {
    let project: AnimationProject;

    const importer = new NativeAnimationImporter();

    try {
        const stream = (await fileHandle.getFile()).stream();
        project = await importer.import(stream);
    } catch (e) {
        // Invalid project file
        throw e;
    } finally {
        importer.dispose();
    }

    await setNewProject(project, fileHandle, current);

    await updateRecentProjectEntries(fileHandle, project);

    return project;
}

type RecentProjectEntry = {
    handle: FileSystemFileHandle,
    title: string,
};

async function updateRecentProjectEntries(handle: FileSystemFileHandle, project?: AnimationProject): Promise<RecentProjectEntry[]> {
    const entry = {
        title: (project != null && project.masterDocument != null ? project.masterDocument.title || '' : '').trim(),
        handle,
    };

    let items = await readRecentProjectEntries();

    // items = items.filter(item => !handle.isSameEntry(item.handle));
    items = items.filter(item => item.handle != null && handle.name !== item.handle.name);
    items.unshift(entry);

    // max 20 entries
    items.splice(20);

    await setIDB("recentProjects", items);

    return items;
}

async function readRecentProjectEntries(): Promise<RecentProjectEntry[]> {
    return (await getIDB<RecentProjectEntry[]>('recentProjects')) || [];
}

export async function saveProject(current: AnimationProject = Project, saveAs?: boolean): Promise<boolean> {
    if (!current || isBusy(current)) {
        return false;
    }

    try {
        return await saveProjectInternal(current, saveAs);
    } catch (e) {
        console.error(e);
        showToast("Failed to save project", "negative");
    }

    return false;
}

function getSuggestedName(name: string | null, extension: string): string {
    return name + '.' + extension;
}

async function saveProjectInternal(current: AnimationProject, saveAs?: boolean): Promise<boolean> {
    IsSaving = true;

    if (!FileHandle || saveAs) {
        try {
            FileHandle = await window.showSaveFilePicker({
                id: 'openProject',
                suggestedName: getSuggestedName(current.masterDocument?.title || 'New project', 'eaf'),
                // excludeAcceptAllOption: true,
                types: EAFileTypes
            });
            if (FileHandle == null) {
                return false;
            }
            ProjectFileHandle.set(FileHandle);
        } catch (e) {
            return false;
        } finally {
            IsSaving = false;
        }
    }

    const exporter = new NativeAnimationExporter();

    try {
        const stream = await exporter.export(current)
        await stream.pipeTo(await FileHandle.createWritable());
    } finally {
        exporter.dispose();
        IsSaving = false;
    }

    IsProjectSaved.set(true);

    await updateRecentProjectEntries(FileHandle, current);

    return true;
}

const SVGTypes = [
    {
        description: 'SVG files',
        startIn: 'documents',
        accept: {
            'image/svg+xml': ['.svg'],
            'text/*': ['.svg'],
        }
    }
]

const exportInfo = {
    selected: 'SMIL',
    types: [
        {
            title: 'Animated SVG (SMIL)',
            value: 'SMIL',
            run: async (settings) => {
                // console.log('exporting...', settings);
                // return false;
                return await exportToFile(Project, new SMILAnimationExporter(settings), SVGTypes, 'svg');
            }
        },
    ],
    settings: {
        'SMIL': {
            size: null,
            fixedSize: false,
            freeze: true,
            repeat: 1,
            repeatTime: 0,
        }
    }
}

async function exportToFile(project: AnimationProject, exporter: Exporter<AnimationProject>, types, extension: string): Promise<boolean> {
    let handle: FileSystemFileHandle;

    try {
        handle = await window.showSaveFilePicker({
            id: 'exportProject',
            suggestedName: getSuggestedName(project.masterDocument?.title || 'New project', extension),
            // excludeAcceptAllOption: true,
            types,
        });
    } catch (e) {
        exporter.dispose();
        return false;
    }

    if (handle == null) {
        return false;
    }

    try {
        const stream = await exporter.export(project)
        await stream.pipeTo(await handle.createWritable());
    } catch (e) {
        console.error(e);
        return false;
    } finally {
        exporter.dispose();
    }

    return true;
}

export async function showExportDialog(project: AnimationProject) {
    await showDialog('export', {
        title: '',
        dismissable: false,
        divider: false,
        size: 'm',
        responsive: true,
        autofocus: false,
        value: exportInfo,
        cancel: {
            label: 'Cancel',
        },
        confirm: {
            label: 'Export',
            action: async (info) => {
                const item = info.types.find(item => item.value === info.selected);
                if (item == null) {
                    return false;
                }
                return item.run(info.settings[info.selected]);
            }
        },
    });
}

export async function createNewProject(data: { title: string, duration: number, width: number, height: number }): Promise<AnimationProject> {
    const document = new AnimationDocument(new Rectangle(0, 0, data.width, data.height));
    document.title = data.title;
    document.animation = new DocumentAnimationMap(document, 0, data.duration);

    const project = new AnimationProject(new AnimatorSource());

    project.addDocument(document);
    project.masterDocument = document;

    await setNewProject(project, null, Project);

    return project;
}

export async function setNewProject(project: AnimationProject, fileHandle: FileSystemFileHandle | null = null, old?: AnimationProject | null): Promise<void> {
    if (old) {
        old.selection.clear();
        old.keyframeSelection.clear();
        notifySelectionChanged();
        notifyKeyframeSelectionChanged();
        old.engine?.stopRenderLoop();
    }

    CurrentTime.set(0);
    CurrentProject.set(project);

    await delay();

    if (old) {
        // dispose the old project
        old.dispose();
    }

    ProjectFileHandle.set(fileHandle);
    IsProjectSaved.set(true);
}


// utils

export async function showDialog<T>(component, dialog: DialogDef, properties?: object): Promise<T> {
    const close = dialog.close;
    return new Promise(resolve => {
        dialog.close = () => {
            if (close) {
                close();
            }
            resolve(dialog.value);
        };
        window.dispatchEvent(new CustomEvent('expressive-dialog', {detail: {component, dialog, properties}}));
    });
}

async function showLoadingDialog(message: string, abort: () => Promise<void>): Promise<void> {
    return showDialog('loading', {
        title: '',
        divider: false,
        dismissable: false,
        size: 's',
        value: message,
        abort,
    });
}

export function showToast(message: string, variant?: string, timeout?: number) {
    window.dispatchEvent(new CustomEvent('expressive-toast', {detail: {message, variant, timeout}}));
}

export function delay(time: number = 0): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

export function isOverlayOpen(): boolean {
    return Overlay['overlayStack'] != null && Overlay['overlayStack'].overlays.length > 0;
}

export function isEventOnInput(event: Event & { target: HTMLElement }): boolean {
    return isInput(event.target) || isInput(event.composedPath()[0] as HTMLElement);
}

export function isInput(el: HTMLElement): boolean {
    return el.isContentEditable ||
        (el instanceof HTMLInputElement) ||
        (el instanceof HTMLSelectElement) ||
        (el instanceof HTMLTextAreaElement);
}
