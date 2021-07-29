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
    html,
    css,
    CSSResultArray,
    TemplateResult,
    property,
    query,
    PropertyValues,
} from '@spectrum-web-components/base';
import { streamingListener } from '@spectrum-web-components/base/src/streaming-listener.js';
import { Focusable } from '@spectrum-web-components/shared/src/focusable.js';

import type {ColorHandle} from '@spectrum-web-components/color-handle';
// use sp-color-slider styles
import styles from '@spectrum-web-components/color-slider/src/color-slider.css.js';


const extraStyles = css`
:host, sp-color-handle {outline: none !important;}
:host([small][vertical]) {--spectrum-colorslider-vertical-width: var(--spectrum-global-dimension-size-200);}
:host([small]:not([vertical])) {--spectrum-colorslider-height: var(--spectrum-global-dimension-size-200);}
`;

export abstract class BaseColorSlider extends Focusable {
    public static get styles(): CSSResultArray {
        return [styles, extraStyles];
    }

    @property({ type: Boolean, reflect: true })
    public disabled = false;

    @property({ type: Boolean, reflect: true })
    public readonly = false;

    @property({ type: Boolean, reflect: true })
    public focused = false;

    @query('.handle')
    private handle!: ColorHandle;

    @property({ type: String })
    public label = '';

    @property({ type: Boolean, reflect: true })
    public vertical = false;

    @property({type: Boolean, reflect: true})
    public invert: boolean = false;

    @property({type: Number})
    public min: number = 0;

    @property({type: Number})
    public max: number = 100;

    @property({ type: Number })
    public step = 1;

    private _value: number = 0;

    @property({ type: Number })
    public get value(): number {
        return this._value;
    }

    public set value(value: number) {
        this.setValue(value);
    }

    @property({ type: Number, reflect: true })
    public sliderHandlePosition = 0;

    @query('input')
    public input!: HTMLInputElement;

    public get focusElement(): HTMLInputElement {
        return this.input;
    }

    private handleKeydown(event: KeyboardEvent): void {
        if (this.readonly) {
            event.preventDefault();
            return;
        }

        let delta = 0;
        switch (event.key) {
            case 'Escape':
            case 'Enter':
                event.preventDefault();
                this.focusElement.blur();
                return;
            case 'ArrowUp':
                delta = this.step;
                break;
            case 'ArrowDown':
                delta = -this.step;
                break;
            case 'ArrowLeft':
                delta = this.step * (this.isLTR ? -1 : 1);
                break;
            case 'ArrowRight':
                delta = this.step * (this.isLTR ? 1 : -1);
                break;
        }

        if (delta === 0) {
            return;
        }

        event.preventDefault();

        if (event.shiftKey) {
            delta *= 10;
        }

        if (this.setValue(this._value + delta)) {
            this.dispatchEvent(
                new Event('input', {
                    bubbles: true,
                    composed: true,
                })
            );
        }
    }

    private handleInput(event: Event & { target: HTMLInputElement }): void {
        if (!this.readonly) {
            this.setValue(event.target.valueAsNumber);
        }
    }

    private setValue(value: number): boolean {
        const oldValue = this._value;
        value = Math.max(this.min, Math.min(this.max, Math.round(value)));
        if (oldValue === value) {
            return false;
        }

        this._value = value;
        this.sliderHandlePosition = 100 * (value / (this.max - this.min));

        this.requestUpdate('value', oldValue);

        return true;
    }

    private handleFocusin(): void {
        this.focused = true;
    }

    private handleFocusout(): void {
        this.focused = false;
    }

    private boundingClientRect!: DOMRect;

    private handlePointerdown(event: PointerEvent): void {
        if (this.readonly) {
            return;
        }

        if (event.button !== 0) {
            event.preventDefault();
            return;
        }
        this.boundingClientRect = this.getBoundingClientRect();
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        this.handleFocusin();
    }

    private handlePointermove(event: PointerEvent): void {
        if (this.readonly) {
            return;
        }

        let pos = this.calculateHandlePosition(event);
        if (this.invert) {
            pos = 1 - pos;
        }

        if (this.setValue(this.min + pos * (this.max - this.min))) {
            this.dispatchEvent(
                new Event('input', {
                    bubbles: true,
                    composed: true,
                    cancelable: true,
                })
            );
        }
    }

    private handlePointerup(event: PointerEvent): void {
        if (this.readonly) {
            return;
        }

        (event.target as HTMLElement).releasePointerCapture(event.pointerId);
        this.focus();
        this.handleFocusout();
    }

    private calculateHandlePosition(event: PointerEvent): number {
        /* c8 ignore next 3 */
        if (!this.boundingClientRect) {
            return this.sliderHandlePosition;
        }

        const rect = this.boundingClientRect;
        const minOffset = this.vertical ? rect.top : rect.left;
        const offset = this.vertical ? event.clientY : event.clientX;
        const size = this.vertical ? rect.height : rect.width;

        return Math.max(0, Math.min(1, (offset - minOffset) / size));
    }

    private handleGradientPointerdown(event: PointerEvent): void {
        if (this.readonly || event.button !== 0) {
            return;
        }

        event.stopPropagation();
        event.preventDefault();
        this.handle.dispatchEvent(new PointerEvent('pointerdown', event));
        this.handlePointermove(event);
    }

    protected abstract get handleColor(): string;

    protected abstract get gradient(): string;

    protected render(): TemplateResult {
        return html`
            <div class="checkerboard" role="presentation" @pointerdown=${this.handleGradientPointerdown}>
                <div class="gradient" role="presentation" style="background: linear-gradient(to ${this.vertical ? (this.invert ? 'top' : 'bottom') : (this.invert ? 'left' : 'right')}, ${this.gradient});"></div>
            </div>
            <sp-color-handle
                tabindex="-1"
                class="handle"
                color="${this.handleColor}"
                ?disabled=${this.disabled}
                style="${this.vertical ? 'top' : 'left'}: ${ this.invert ? (100 - this.sliderHandlePosition) : this.sliderHandlePosition}%"
                @manage=${streamingListener(
            { type: 'pointerdown', fn: this.handlePointerdown },
            { type: 'pointermove', fn: this.handlePointermove },
            { type: ['pointerup', 'pointercancel'], fn: this.handlePointerup,}
                )}
            ></sp-color-handle>
            <input
                type="range"
                class="slider"
                min="${this.min}"
                max="${this.max}"
                step=${this.step}
                ?disabled=${this.disabled}
                ?readonly=${this.readonly}
                aria-label=${this.label}
                .value=${String(this.value)}
                @input=${this.handleInput}
                @keydown=${this.handleKeydown}
            />
        `;
    }

    protected firstUpdated(changed: PropertyValues): void {
        super.firstUpdated(changed);
        this.boundingClientRect = this.getBoundingClientRect();
        this.addEventListener('focusin', this.handleFocusin);
        this.addEventListener('focusout', this.handleFocusout);
    }
}
