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
import type { WithSWCResizeObserver, SWCResizeObserverEntry } from '@spectrum-web-components/color-wheel/src/types';
import { Focusable } from '@spectrum-web-components/shared/src/focusable.js';
import '@spectrum-web-components/color-handle/sp-color-handle.js';
import styles from '@spectrum-web-components/color-wheel/src/color-wheel.css.js';
import type {ColorHandle} from '@spectrum-web-components/color-handle';

const extraStyles = css`
sp-color-handle {
  outline: none !important;
}

.conic-gradient {
  width: 100%;
  height: 100%;
  background: conic-gradient(from 90deg, rgb(255, 0, 0), rgb(255, 128, 0), rgb(255, 255, 0), rgb(128, 255, 0), rgb(0, 255, 0), rgb(0, 255, 128), rgb(0, 255, 255), rgb(0, 128, 255), rgb(0, 0, 255), rgb(128, 0, 255), rgb(255, 0, 255), rgb(255, 0, 128), rgb(255, 0, 0));
}
          
:host([disabled]) .conic-gradient {
  background: var(--spectrum-colorwheel-fill-color-disabled, var(--spectrum-global-color-gray-300));
}

::slotted(sp-color-area)  {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: var(--spectrum-inner-color-area-size);
  height: var(--spectrum-inner-color-area-size);
}

::slotted(sp-color-area[focused]) {
  z-index: 5;  
}
`;

export class ColorWheel extends Focusable {
    public static get styles(): CSSResultArray {
        return [styles, extraStyles];
    }

    @property({ type: Boolean, reflect: true })
    public disabled = false;

    @property({ type: Boolean, reflect: true })
    public readonly = false;

    @property({ type: Number })
    public thickness: number = 24;

    @property({ type: Boolean, reflect: true })
    public focused = false;

    @query('.handle')
    private handle!: ColorHandle;

    @query('slot:not([name])')
    private _defaultSlot: HTMLSlotElement;

    @property({ type: String })
    public label = 'hue';

    private _value: number = 0;

    @property({ type: Number })
    public get value(): number {
        return this._value;
    }

    public set value(value: number) {
        value = Math.round(value) % 360;
        const oldValue = this._value;
        if (oldValue !== value) {
            this._value = value;
            this.requestUpdate('value', oldValue);
        }
    }

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

    @query('input')
    public input!: HTMLInputElement;

    public get focusElement(): HTMLInputElement {
        return this.input;
    }

    private handleKeydown(event: KeyboardEvent): void {
        if (this.readonly) {
            return;
        }

        let delta = 0;

        switch (event.key) {
            case 'Escape':
            case 'Enter':
                this.edit = false;
                this.focusElement.blur();
                return;
            case 'ArrowUp':
                delta = 1;
                break;
            case 'ArrowDown':
                delta = -1;
                break;
            case 'ArrowLeft':
                delta = this.isLTR ? -1 : 1;
                break;
            case 'ArrowRight':
                delta = this.isLTR ? 1 : -1;
                break;
            default:
                return;
        }

        if (delta === 0) {
            return;
        }

        event.preventDefault();

        if (event.shiftKey) {
            delta *= 10;
        }

        this.setValue(this.value + delta);
    }

    private handleInput(event: Event & { target: HTMLInputElement }): void {
        if (!this.readonly && this.value !== event.target.valueAsNumber) {
            this.edit = true;
            this.value = event.target.valueAsNumber;
        }
    }

    private handleFocusin(e: Event): void {
        if (this._defaultSlot.assignedElements().includes(e.target as HTMLElement)) {
            this.edit = false;
            this.focused = false;
        } else {
            this.focused = true;
        }
    }

    private handleFocusout(): void {
        this.edit = false;
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
        this.handleFocusin(event);
    }

    private handlePointermove(event: PointerEvent): void {
        if (!this.readonly) {
            this.setValue(this.calculateHandlePosition(event));
        }
    }

    private setValue(value: number) {
        if (this.value === value) {
            return;
        }
        this.edit = true;
        this.value = value;
        this.dispatchEvent(new CustomEvent<number>('input', {
            bubbles: false,
            composed: true,
            detail: this.value
        }));
    }

    private handlePointerup(event: PointerEvent): void {
        if (this.readonly) {
            return;
        }
        // Retain focus on input element after mouse up to enable keyboard interactions
        (event.target as HTMLElement).releasePointerCapture(event.pointerId);
        this.focus();
        this.handleFocusout();
        this.edit = false;
    }

    private calculateHandlePosition(event: PointerEvent): number {
        /* c8 ignore next 3 */
        if (!this.boundingClientRect) {
            return this.value;
        }
        const rect = this.boundingClientRect;
        const { width, height, left, top } = rect;
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        const pointX = event.clientX - centerX;
        const pointY = event.clientY - centerY;
        const value = (Math.atan2(pointY, pointX) * 180) / Math.PI;

        return (360 + (360 + Math.round(value))) % 360;
    }

    private handleGradientPointerdown(event: PointerEvent): void {
        if (
            this.readonly ||
            event.button !== 0 ||
            (event.target as SVGElement).classList.contains('innerCircle')
        ) {
            return;
        }
        event.stopPropagation();
        event.preventDefault();
        this.handle.dispatchEvent(new PointerEvent('pointerdown', event));
        this.handlePointermove(event);
    }

    protected getClipPath(size: number, handlerSize: number): string {
        const hSz = size / 2;
        const hCh = hSz - handlerSize;
        const dCh = size - 2 * handlerSize;
        return `path(evenodd, 'M ${hSz} ${hSz} m -${hSz} 0 a ${hSz} ${hSz} 0 1 0 ${size} 0 a ${hSz} ${hSz} 0 1 0 -${size} 0 M ${hSz} ${hSz} m -${hCh} 0 a ${hCh} ${hCh} 0 1 0 ${dCh} 0 a ${hCh} ${hCh} 0 1 0 -${dCh} 0')`;
    }

    protected render(): TemplateResult {
        const width = this.boundingClientRect?.width || 0;
        const radius = width / 2;

        const dRadius = this.thickness / 2 + 0.5;

        const handleLocationStyles = `transform: translate(${
            (radius - dRadius) * Math.cos((this.value * Math.PI) / 180)
        }px, ${(radius - dRadius) * Math.sin((this.value * Math.PI) / 180)}px);`;

        // handler size is 24
        const inner = (width - 2 * 24) * 0.7071067811865476;

        return html`
            <slot name="gradient" @pointerdown=${this.handleGradientPointerdown}>
                <div class="conic-gradient" style="clip-path: ${this.getClipPath(width, this.thickness)};"></div>
            </slot>
            <slot @focusin=${this.handleFocusout} style="--spectrum-inner-color-area-size: ${inner}px"></slot>
            <sp-color-handle
                tabindex="-1"
                class="handle"
                color="hsl(${this.value}, 100%, 50%)"
                ?disabled=${this.disabled}
                style=${handleLocationStyles}
                @manage=${streamingListener(
            { type: 'pointerdown', fn: this.handlePointerdown },
            { type: 'pointermove', fn: this.handlePointermove },
            {type: ['pointerup', 'pointercancel'], fn: this.handlePointerup,}
                )}
            ></sp-color-handle>
            <input
                type="range"
                class="slider"
                aria-label=${this.label}
                min="0"
                max="360"
                step="1"
                ?disabled=${this.disabled}
                ?readonly=${this.readonly}
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
