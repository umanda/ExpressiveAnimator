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

import {html, svg, nothing} from "@spectrum-web-components/base";
import type {TemplateResult} from "@spectrum-web-components/base";

export async function patchSpectrum() {
    await patchIcon();
    await patchNumberField();
    await patchSlider();
    await patchPicker();
    await patchTabPanel();
    await patchColorLoupe();
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

async function patchColorLoupe() {
    await customElements.whenDefined('sp-color-loupe');
    const loupe = customElements.get('sp-color-loupe');

    Object.defineProperty(loupe.prototype, 'checkerboard', {
        value: true,
        writable: true,
        enumerable: true
    });

    loupe.prototype.renderCheckerBoardDefs = function (): TemplateResult {
        const size = 8;
        const width = 100 * size / 24;
        const height = width * 3 / 4;
        return svg`<defs>
            <pattern id="loupe-checkerboard" shape-rendering="geometricPrecision" color-rendering="optimizeQuality" x="0" y="0" width="${width}%" height="${height}%">
                <rect x="0" y="0" width="${size}" height="${size}" fill="#bcbcbc" />
                <rect x="${size}" y="0" width="${size}" height="${size}" fill="#fff" />
                <rect x="0" y="${size}" width="${size}" height="${size}" fill="#fff" />
                <rect x="${size}" y="${size}" width="${size}" height="${size}" fill="#bcbcbc" />
            </pattern>
        </defs>`;
    }

    loupe.prototype.render = function (): TemplateResult {
        return html`
            <svg>
                ${this.checkerboard ? this.renderCheckerBoardDefs() : nothing}
                <g transform="translate(1 1)">
                    ${this.checkerboard ? svg`<path class="inner" fill="url(#loupe-checkerboard)" d="M24,0A24,24,0,0,1,48,24c0,16.255-24,40-24,40S0,40.255,0,24A24,24,0,0,1,24,0Z" />` : nothing}
                    <path class="inner" fill="${this.color}" d="M24,0A24,24,0,0,1,48,24c0,16.255-24,40-24,40S0,40.255,0,24A24,24,0,0,1,24,0Z" />
                    <path
                        class="outer"
                        d="M24,2A21.98,21.98,0,0,0,2,24c0,6.2,4,14.794,11.568,24.853A144.233,144.233,0,0,0,24,61.132,144.085,144.085,0,0,0,34.4,48.893C41.99,38.816,46,30.209,46,24A21.98,21.98,0,0,0,24,2m0-2A24,24,0,0,1,48,24c0,16.255-24,40-24,40S0,40.255,0,24A24,24,0,0,1,24,0Z"
                    />
                </g>
            </svg>
        `;
    }
}