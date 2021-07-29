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
    SpectrumElement,
    CSSResultArray,
    TemplateResult,
    property,
    PropertyValues,
    query,
} from '@spectrum-web-components/base';
import { streamingListener } from '@spectrum-web-components/base/src/streaming-listener.js';
import type { WithSWCResizeObserver, SWCResizeObserverEntry } from '@spectrum-web-components/color-area/src/types';
import type {ColorHandle} from '@spectrum-web-components/color-handle';
import '@spectrum-web-components/color-handle/sp-color-handle.js';
import {TinyColor} from '@ctrl/tinycolor';

import styles from '@spectrum-web-components/color-area/src/color-area.css.js';

const preventDefault = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') {
        event.preventDefault();
    }
}

export class ColorArea extends SpectrumElement {
    public static get styles(): CSSResultArray {
        return [styles];
    }

    @property({ type: Boolean, reflect: true })
    public disabled = false;

    @property({ type: Boolean, reflect: true })
    public readonly = false;

    @property({ type: Boolean, reflect: true })
    public focused = false;

    @property({ type: String })
    public label = 'saturation and luminosity';

    @query('.handle')
    private handle!: ColorHandle;

    private _edit: boolean = false;

    private get edit(): boolean {
        return this._edit;
    }

    private set edit(value: boolean) {
        if (this._edit !== value) {
            this._edit = value;
            this.dispatchEvent(new CustomEvent<boolean>("edit", {
                bubbles: false,
                composed: true,
                detail: value,
            }))
        }
    }

    private _hue: number = 0;

    @property({ type: Number })
    public get hue(): number {
        return this._hue;
    }

    public set hue(value: number) {
        value = Math.min(360, Math.max(0, Math.round(value)));
        const oldValue = this._hue;
        if (value !== oldValue) {
            this._hue = value;
            this.requestUpdate('hue', oldValue);
        }
    }

    private _x: number = 1;
    private _y: number = 0;

    @property({type: Number})
    public get x(): number {
        return this._x;
    }

    public set x(value: number) {
        this.setValue(value, 'x');
    }

    @property({type: Number})
    public get y(): number {
        return this._y;
    }

    public set y(value: number) {
        this.setValue(value, 'y');
    }

    private setValue(value: number, field: 'x' | 'y', dispatch?: boolean): boolean {
        value = this.getPercent(value);
        const prop = '_' + field as '_x' | '_y';
        const prev = this[prop];
        if (prev === value) {
            return false;
        }

        this[prop] = value;
        if (dispatch) {
            this.edit = true;
            this.dispatchInput();
        }
        this.requestUpdate(field, prev);

        return true;
    }

    @query('[name="x"]')
    public inputX!: HTMLInputElement;

    @query('[name="y"]')
    public inputY!: HTMLInputElement;

    private handleFocusin(): void {
        this.focused = true;
    }

    private handleFocusout(): void {
        this.edit = false;
        this.focused = false;
    }

    private handleKeydown(e: KeyboardEvent): void {
        if (this.readonly) {
            return;
        }

        let dx = 0, dy = 0;

        switch (e.key) {
            case 'Escape':
            case 'Enter':
                e.preventDefault();
                this.edit = false;
                this.blur();
                return;
            case 'ArrowUp':
                dy = -0.01;
                break;
            case 'ArrowDown':
                dy = 0.01;
                break;
            case 'ArrowLeft':
                dx = this.isLTR ? -0.01 : 0.01;
                break;
            case 'ArrowRight':
                dx = this.isLTR ? 0.01 : -0.01;
                break;
            default:
                return;
        }

        e.preventDefault();

        if (e.shiftKey) {
            dx *= 10;
            dy *= 10;
        }

        if (dx !== 0) {
            this.inputX.focus();
            this.setValue(this.x + dx,  'x', true);
        } else {
            this.inputY.focus();
            this.setValue(this.y + dy,  'y', true);
        }
    }

    private handleInput(event: Event & { target: HTMLInputElement }): void {
        if (!this.readonly) {
            this.setValue(event.target.valueAsNumber, event.target.name as any, true);
        }
    }

    private boundingClientRect!: DOMRect;

    private handlePointerdown(event: PointerEvent): void {
        if (this.readonly || event.button !== 0) {
            event.preventDefault();
            return;
        }

        this.boundingClientRect = this.getBoundingClientRect();

        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        this.handleFocusin();
    }

    private handlePointermove(event: PointerEvent): void {
        const [x, y] = this.calculateHandlePosition(event);

        if (this._x !== x || this._y !== y) {
            this._x = x;
            this._y = y;
            this.edit = true;
            this.dispatchInput();
            this.requestUpdate();
        }
    }

    private handlePointerup(event: PointerEvent): void {
        event.preventDefault();
        (event.target as HTMLElement).releasePointerCapture(event.pointerId);
        this.inputX.focus();
        this.edit = false;
        this.handleFocusout();
    }

    private calculateHandlePosition(event: PointerEvent): [number, number] {
        /* c8 ignore next 3 */
        if (!this.boundingClientRect) {
            return [this.x, this.y];
        }

        const rect = this.boundingClientRect;

        return [
            this.getPercent((event.clientX - rect.left) / rect.width),
            this.getPercent((event.clientY - rect.top) / rect.height),
        ];
    }

    private getPercent(value: number): number {
        return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
    }

    private dispatchInput() {
        this.dispatchEvent(new CustomEvent('input', {
            bubbles: false,
            composed: true,
            detail: {h: this.hue, s: this.x, v: 1 - this.y}
        }));
    }

    private handleAreaPointerdown(event: PointerEvent): void {
        if (event.button !== 0) {
            return;
        }
        event.stopPropagation();
        event.preventDefault();
        this.handle.dispatchEvent(new PointerEvent('pointerdown', event));
        this.handlePointermove(event);
    }

    private get gradient(): string {
        return `linear-gradient(to top, black 0%, hsla(${this.hue}, 100%, 0%, 0) 100%), linear-gradient(to right, white 0%, hsla(${this.hue}, 100%, 0%, 0) 100%), hsl(${this.hue}, 100%, 50%)`;
    }

    private get color(): TinyColor {
        return new TinyColor({
            h: this.hue,
            s: this.x,
            v: 1 - this.y
        });
    }

    protected render(): TemplateResult {
        const { width = 0, height = 0 } = this.boundingClientRect || {};

        return html`
            <div class="gradient" @pointerdown=${this.handleAreaPointerdown} style="background: ${this.gradient};"></div>
            <sp-color-handle
                tabindex="-1"
                class="handle"
                color=${this.color.toHexString(false)}
                ?disabled=${this.disabled}
                style="transform: translate(${this.x * width}px, ${this.y * height}px);"
                @manage=${streamingListener(
            { type: 'pointerdown', fn: this.handlePointerdown },
            { type: 'pointermove', fn: this.handlePointermove },
            {type: ['pointerup', 'pointercancel'], fn: this.handlePointerup}
                )}
            ></sp-color-handle>
            <input
                type="range"
                class="slider"
                name="x"
                aria-label=${this.label}
                min="0"
                max="1"
                step="0.01"
                ?disabled=${this.disabled}
                .value=${String(this.x)}
                @input=${this.handleInput}
                @keydown=${preventDefault}
            />
            <input
                type="range"
                class="slider"
                name="y"
                aria-label=${this.label}
                min="0"
                max="1"
                step="0.01"
                ?disabled=${this.disabled}
                .value=${String(this.y)}
                @input=${this.handleInput}
                @keydown=${preventDefault}
            />
        `;
    }

    protected firstUpdated(changed: PropertyValues): void {
        super.firstUpdated(changed);
        this.boundingClientRect = this.getBoundingClientRect();

        this.addEventListener('focusin', this.handleFocusin);
        this.addEventListener('focusout', this.handleFocusout);
        this.addEventListener('keydown', this.handleKeydown);
    }

    private observer?: WithSWCResizeObserver['ResizeObserver'];

    public connectedCallback(): void {
        super.connectedCallback();
        if (
            !this.observer &&
            ((window as unknown) as WithSWCResizeObserver).ResizeObserver
        ) {
            this.observer = new ((window as unknown) as WithSWCResizeObserver).ResizeObserver(
                (entries: SWCResizeObserverEntry[]) => {
                    for (const entry of entries) {
                        this.boundingClientRect = entry.contentRect;
                    }
                    this.requestUpdate();
                }
            );
        }
        this.observer?.observe(this);
    }

    public disconnectedCallback(): void {
        this.observer?.unobserve(this);
        super.disconnectedCallback();
    }
}
