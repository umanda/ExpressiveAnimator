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

import {html} from "@spectrum-web-components/base";

export async function patchSpectrum() {
    await patchIcon();
    await patchNumberField();
    await patchSlider();
    await patchPicker();
    await patchTabPanel();
}

async function patchSlider() {
    await customElements.whenDefined('sp-slider');
    const slider = customElements.get('sp-slider');

    const prop = Object.getOwnPropertyDescriptor(slider.prototype, 'ariaValueText');
    const get = prop.get;
    prop.get = function () {
        return html`<slot name="edit">${get.call(this)}</slot>`;
    };

    Object.defineProperty(slider.prototype, 'ariaValueText', prop);
}

async function patchNumberField() {
    await customElements.whenDefined('sp-number-field');
    const field = customElements.get('sp-number-field');

    const stepBy = field.prototype.stepBy;
    field.prototype.stepBy = function (count: number): void {
        // do not step when readonly
        if (!(this.focusElement as HTMLElement)?.hasAttribute('readonly')) {
            stepBy.call(this, count);
        }
    }
}

async function patchTabPanel() {
    await customElements.whenDefined('sp-tab-panel');
    const panel = customElements.get('sp-tab-panel');

    const firstUpdated = panel.prototype.firstUpdated;
    panel.prototype.firstUpdated = function () {
        firstUpdated.call(this);
        if (this.classList.contains('scroll')) {
            this.tabIndex = -1;
        }
    };

    const updated = panel.prototype.updated;
    panel.prototype.updated = function (changes) {
        updated.call(this, changes);
        if (this.classList.contains('scroll')) {
            this.tabIndex = -1;
        }
    };
}

async function patchPicker() {
    await customElements.whenDefined('sp-picker');
    const picker = customElements.get('sp-picker');
    const open = picker.openOverlay;
    picker.openOverlay = async function (target: HTMLElement, interaction, content, options) {
        interaction = target.hasAttribute("interaction") ? target.getAttribute("interaction") : "modal";
        return open(target, interaction, content, options);
    };
}

async function patchIcon() {
    await customElements.whenDefined('sp-icon');
    const icon = customElements.get('sp-icon');
    const prop = Object.getOwnPropertyDescriptor(icon.prototype, 'name')
    const set = prop.set;
    prop.set = function (value) {
        if (this.name === value) {
            return;
        }
        set.call(this, value);
        this.setAttribute('name', value);
    }
    Object.defineProperty(icon.prototype, 'name', prop);

    const updateIcon = icon.prototype.updateIcon;
    icon.prototype.updateIcon = async function () {
        if (this.updateIconPromise) {
            // wait for current update
            await this.updateIconPromise;
        }
        return updateIcon.call(this);
    }
}