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

import {Disposable, Element, equals, GlobalElementProperties} from "@zindex/canvas-engine";
import type {AnimationProject} from "../../Core";
import {KeyframeCounter} from "../../Core";
import {CurrentProject, notifyPropertiesChanged} from "../../Stores";

export type PropertyUpdate = (current: any, value: any, property: string, element?: Element | null) => any;

export type PropertyInfo = {
    property: string,
    value: any,
    // Element type
    type?: string,
    update?: PropertyUpdate,
};

export type ActionCallback = (project: AnimationProject, element: Element, value?: any) => boolean;
export type ActionInfo = {
    action: ActionCallback,
    // Sent as parameter to action callback
    value?: any,
    // Optional, used only for global properties
    type?: string,
}

export class PropertyUpdater implements Disposable {
    protected started: boolean = false;
    protected property: string | null = null;
    protected type: string | undefined = undefined;
    protected value: any = undefined;
    protected initial: any = undefined;
    protected initialValues: Map<Element, any> = new Map<Element, any>();

    protected keyframeCounter: KeyframeCounter = new KeyframeCounter();
    protected _project: AnimationProject = null;
    protected _unsubscribe: () => void;

    constructor() {
        this._unsubscribe = CurrentProject.subscribe(p => this._project = p);
    }

    dispose() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
        this._project = null;
    }

    get project(): AnimationProject {
        return this._project;
    }

    startUpdate(info: PropertyInfo) {
        if (this.started && !this.isSameProperty(info)) {
            // new property update is about to start
            // end with current update
            this.endUpdate();
        }

        this.started = true;
        this.property = info.property;
        this.type = info.type;
        this.initial = info.value;
        this.value = undefined;
        this.startKeyframeCounter();
        this.saveInitialValues();

        this.debug('start');
    }

    endUpdate() {
        if (!this.started) {
            return;
        }

        this.debug('end');
        if (!this.sameAsInitial || this.keyframesWereAdded) {
            this.snapshot();
        }

        this.initialValues.clear();
        this.started = false;
        this.property = this.type = this.value = this.initial = undefined;
    }

    update(info: PropertyInfo) {
        if (!this.isSameProperty(info)) {
            // another property is updated
            // stop with this one
            this.endUpdate();
        }

        if (!this.started) {
            this.updateProperty(info, true);
            return;
        }

        if (!equals(this.value, info.value)) {
            this.value = info.value;
            this.updateProperty(info, false);
            return;
        }
    }

    updateProperty(info: PropertyInfo, snapshot?: boolean): boolean {
        if (!this.internalUpdate(info)) {
            return false;
        }

        this.debug('update');

        if (snapshot) {
            this.snapshot();
        } else {
            notifyPropertiesChanged();
            this.invalidate();
        }

        return true;
    }

    updateGlobalProperty(info: PropertyInfo) {
        if (info.type != null) {
            this.globalProperties.updateSpecificElementProperty(info.type, info.property, info.value);
        } else {
            // TODO: using update()?
            this.globalProperties.updateProperty(info.property, info.value);
        }
    }

    updateDocumentProperty(info: PropertyInfo) {
        if (this.started) {
            this.endUpdate();
        }

        const document = this.project?.document;
        if (!document) {
            return;
        }

        const obj = info.type === 'animation' ? document.animation : document;

        if (!(info.property in obj) || equals(obj[info.property], info.value)) {
            return;
        }

        obj[info.property] = info.value;

        this.snapshot();
    }

    callAction(info: ActionInfo): boolean {
        // end any started update
        this.endUpdate();

        this.debug('action', info);
        this.startKeyframeCounter();

        let changed: boolean = false;

        for (const element of this.project.selection) {
            if (info.action(this.project, element, info.value)) {
                changed = true;
            }
        }

        if (changed || this.keyframesWereAdded) {
            this.snapshot();
            return true;
        }

        return false;
    }

    callGlobalElementAction(info: {type: string, value: any}): boolean {
        if (!info.type) {
            return false;
        }

        const global = this.globalProperties;
        if (typeof global[info.type] !== 'function') {
            return false;
        }

        global[info.type](info.value);

        return true;
    }

    snapshot(): void {
        this.debug('snapshot');
        this.updateGlobalProperties();
        this.project.state.snapshot();
        this.project?.engine?.invalidate();
    }

    protected updateGlobalProperties() {
        if (!this.project.selection.isEmpty) {
            this.project?.engine.globalElementProperties.updateFromElement(this.project.selection.activeElement);
        }
    }

    protected get globalProperties(): GlobalElementProperties {
        return this.project.engine.globalElementProperties;
    }

    protected invalidate() {
        this.project?.engine?.invalidate();
    }

    protected saveInitialValues() {
        this.initialValues.clear();

        const selection = this.project.selection;
        if (selection.isEmpty) {
            return;
        }

        for (const element of selection) {
            if ((this.type != null && element.type !== this.type) || !(this.property in element)) {
                continue;
            }
            this.initialValues.set(element, element[this.property]);
        }
    }

    protected internalUpdate(info: PropertyInfo): boolean {
        const project = this.project;
        if (!info.update) {
            return project.middleware.setElementsProperty(
                project.selection,
                info.property as any,
                info.value,
                this.createElementFilter(info.type)
            );
        }

        let changed: boolean = false;
        for (const element of project.selection) {
            if ((info.type != null && element.type !== info.type) || !(info.property in element)) {
                continue;
            }
            const next = info.update(element[info.property], info.value, info.property, element);
            if (next === undefined) {
                continue;
            }
            if (project.middleware.setElementProperty(element, info.property as any, next)) {
                changed = true;
            }
        }

        return changed;
    }

    protected createElementFilter(type: string) {
        if (!type) {
            return null;
        }
        return (e: Element) => e.type === type;
    }

    protected get keyframesWereAdded(): boolean {
        return this.keyframeCounter.hasChanged(this.project.engine);
    }

    protected startKeyframeCounter() {
        this.keyframeCounter.start(this.project.engine);
    }

    protected get sameAsInitial(): boolean {
        if (this.value === undefined) {
            // not changed
            return true;
        }

        if (!equals(this.initial, this.value)) {
            return false;
        }

        if (this.initialValues.size === 0) {
            return true;
        }

        for (const [element, value] of this.initialValues) {
            if (!equals(value, element[this.property])) {
                return false;
            }
        }

        return true;
    }

    protected debug(action: string, data?) {
        return;
        if (!data) {
            data = this.property;
        }
        console.log(action, data);
    }

    protected isSameProperty(info: PropertyInfo) {
        return this.property === info.property && this.type == info.type;
    }
}
