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
    PropertyValues,
} from '@spectrum-web-components/base';
import { Focusable } from '@spectrum-web-components/shared/src/focusable.js';
import type { ColorHandle } from '@spectrum-web-components/color-handle';
import type {Color, StopColor, StopColorList} from "../../../CanvasEngine";
import {WritableStopColorList} from "../../../CanvasEngine";

const styles = css`
:host {touch-action: none;}
:host(:not([vertical])) {touch-action: pan-y;}
:host([vertical]) {touch-action: pan-x;}
.gradient {overflow: hidden;}

:host, sp-color-handle {
  outline: none !important;
}

sp-color-handle[selected] {
  z-index: 10;
  --spectrum-colorhandle-inner-border-color: var(--spectrum-alias-border-color-focus);
}

:host([small][vertical]) {
  --spectrum-colorslider-vertical-width: var(--spectrum-global-dimension-size-200);
}

:host([small]:not([vertical])) {
  --spectrum-colorslider-height: var(--spectrum-global-dimension-size-200);
}

:host {
/* .spectrum-ColorSlider */
--spectrum-colorslider-handle-hitarea-border-radius: 0%;
--spectrum-colorslider-handle-hitarea-width: var(--spectrum-global-dimension-size-300);
--spectrum-colorslider-handle-hitarea-height: var(--spectrum-global-dimension-size-300);
}
  
.handle:not([selected]) {
  transition: none !important;
}
  
.slider {
/* .spectrum-ColorSlider-slider */
opacity: 0.0001;
position: absolute;
top: 0;
left: 0;
width: 100%;
height: 100%;
z-index: 0;
margin: 0;
pointer-events: none;
}

:host {
/* .spectrum-ColorSlider */
position: relative;
display: block;
width: var(--spectrum-colorslider-default-length, var(--spectrum-global-dimension-size-2400));
height: var(--spectrum-colorslider-height, var(--spectrum-global-dimension-size-300));
-webkit-user-select: none;
user-select: none;
cursor: default;
}

:host([focused]) {z-index: 2;}
:host([disabled]) {pointer-events: none;}
:host([vertical]) {
    display: inline-block;
    width: var(--spectrum-colorslider-vertical-width, var(--spectrum-global-dimension-size-300));
    height: var(--spectrum-colorslider-vertical-default-length, var(--spectrum-global-dimension-size-2400));
}
:host([vertical]) .handle {left: 50%;top: 0;}
.handle {left: 0;top: 50%;}
.handle:after {
    border-radius: var(--spectrum-colorslider-handle-hitarea-border-radius);
    width: var(--spectrum-colorslider-handle-hitarea-width);
    height: var(--spectrum-colorslider-handle-hitarea-height);
}
.checkerboard {
/* .spectrum-ColorSlider-checkerboard */
background-size: var(--spectrum-global-dimension-static-size-200, 16px) var(--spectrum-global-dimension-static-size-200, 16px);
background-position: 0 0, 0 var(--spectrum-global-dimension-static-size-100, 8px), var(--spectrum-global-dimension-static-size-100, 8px) 
calc(-1 * var(--spectrum-global-dimension-static-size-100, 8px)),
calc(-1 * var(--spectrum-global-dimension-static-size-100, 8px)) 0;
}
.checkerboard:before {
/* .spectrum-ColorSlider-checkerboard:before */
content: '';
z-index: 1;
position: absolute;
top: 0;
left: 0;
bottom: 0;
right: 0;
border-radius: var(--spectrum-colorslider-border-radius, var(--spectrum-alias-border-radius-regular));
}
.checkerboard,
.gradient {
/* .spectrum-ColorSlider-checkerboard,
* .spectrum-ColorSlider-gradient */
width: 100%;
height: 100%;
border-radius: var(--spectrum-colorslider-border-radius, var(--spectrum-alias-border-radius-regular));
}
:host {
/* .spectrum-ColorSlider */
--spectrum-colorslider-border-color: var(--spectrum-colorarea-border-color);
}
.checkerboard {
/* .spectrum-ColorSlider-checkerboard */
background-color: var(--spectrum-global-color-static-white, #fff);
background-image: linear-gradient(
        -45deg,
        transparent 75.5%,
        var(--spectrum-global-color-static-gray-500, #bcbcbc) 0
),
linear-gradient(
        45deg,
        transparent 75.5%,
        var(--spectrum-global-color-static-gray-500, #bcbcbc) 0
),
linear-gradient(
        -45deg,
        var(--spectrum-global-color-static-gray-500, #bcbcbc) 25.5%,
        transparent 0
),
linear-gradient(
        45deg,
        var(--spectrum-global-color-static-gray-500, #bcbcbc) 25.5%,
        transparent 0
);
}
.checkerboard:before {
/* .spectrum-ColorSlider-checkerboard:before */
box-shadow: inset 0 0 0
var(
        --spectrum-colorslider-border-size,
        var(--spectrum-alias-border-size-thin)
)
var(--spectrum-colorslider-border-color);
}
:host([disabled]) .checkerboard {
/* .spectrum-ColorSlider.is-disabled .spectrum-ColorSlider-checkerboard */
background: var(
        --spectrum-colorslider-fill-color-disabled,
        var(--spectrum-global-color-gray-300)
);
}
:host([disabled]) .checkerboard:before {
/* .spectrum-ColorSlider.is-disabled .spectrum-ColorSlider-checkerboard:before */
box-shadow: 0 0 0
var(
        --spectrum-colorslider-border-size,
        var(--spectrum-alias-border-size-thin)
)
var(
        --spectrum-colorslider-border-color-disabled,
        var(--spectrum-global-color-gray-300)
);
}
:host([disabled]) .gradient {
/* .spectrum-ColorSlider.is-disabled .spectrum-ColorSlider-gradient */
display: none;
}
`;

export class GradientSlider extends Focusable {
    public static get styles(): CSSResultArray {
        return [styles];
    }

    public maxHandles: number = 50;

    @property({ type: Boolean, reflect: true })
    public disabled = false;

    @property({ type: Boolean, reflect: true })
    public readonly = false;

    @property({ type: Boolean, reflect: true })
    public focused = false;

    @property({ type: String })
    public label = 'gradient';

    @property({ type: Boolean, reflect: true })
    public vertical = false;

    @property({type: Boolean, reflect: true})
    public invert: boolean = false;

    private _value: StopColorList;
    private _workingValue: WritableStopColorList = null;
    private _edit: boolean = false;

    @property({type: Boolean})
    public get edit(): boolean {
        return this._edit;
    }

    public set edit(value: boolean) {
        if (this._edit === value) {
            return;
        }

        this._edit = value;

        if (value) {
            this._workingValue = this._value.createWritable();
        } else {
            this.sortWorkingList();
            this._workingValue = null;
        }

        this.dispatchEvent(new CustomEvent<boolean>('edit', {
            composed: true,
            bubbles: false,
            detail: value,
        }));
    }

    private sortWorkingList(): WritableStopColorList {
        const stop = this._workingValue.list[this.selectedIndex];
        this._workingValue.sort();
        this.setSelectedIndex(this._workingValue.list.indexOf(stop), true);
        return this._workingValue;
    }

    private _selectedIndex: number = 0;

    @property({type: Number})
    public get selectedIndex(): number {
        return this._selectedIndex;
    }

    public set selectedIndex(value: number) {
        this.setSelectedIndex(value, true);
    }

    public setSelectedIndex(value: number, dispatch: boolean = true) {
        if (value === this._selectedIndex || value < 0 || value >= this.currentValue.length) {
            return;
        }

        const prev = this._selectedIndex;
        this._selectedIndex = value;

        this.getHandle(prev).open = false;

        if (dispatch) {
            this.dispatchEvent(new CustomEvent<number>('select', {
                composed: true,
                bubbles: false,
                detail: value
            }));
        }

        this.requestUpdate("selectedIndex", prev);
    }

    private getHandle(index: number): ColorHandle {
        return this.shadowRoot.querySelector(`sp-color-handle[data-index="${index}"]`);
    }

    @property({ type: Object })
    public get value(): StopColorList {
        return this._value;
    }

    public set value(value: StopColorList) {
        const prev = this._value;
        if (value === prev) {
            return;
        }

        this._value = value;

        if (!this._workingValue && this.selectedIndex >= value.length) {
            this.selectedIndex = value.length - 1;
        }

        this.dispatchEvent(new CustomEvent('value', {
            bubbles: false,
            composed: true,
            detail: this.color
        }));

        this.requestUpdate('value', prev);
    }

    public get currentValue(): StopColorList | WritableStopColorList {
        return this._edit ? this._workingValue : this._value;
    }

    public get focusElement(): HTMLElement {
        return this;
    }

    @property({type: Object})
    public get color(): Color {
        return this.currentValue.list[this.selectedIndex].color;
    }

    public set color(value: Color) {
        this.edit = true;
        const stop = this.currentValue.list[this.selectedIndex];
        if (!stop.color.equals(value)) {
            const prev = stop.color;
            stop.color = value;
            this.dispatchUpdate();
            this.requestUpdate('color', prev);
        }
    }

    @property({type: Number})
    public get offset(): number {
        return this.currentValue.list[this.selectedIndex].offset;
    }

    public set offset(value: number) {
        const stop = this.currentValue.list[this.selectedIndex];

        if (!stop) {
            return;
        }

        value = Math.max(0, Math.min(1, Math.round(value * 100) / 100));
        if (stop.offset === value) {
            return;
        }

        this.edit = true;

        const prev = stop.offset;

        stop.offset = value;

        this.dispatchUpdate();

        this.requestUpdate('offset', prev);
    }

    private dispatchUpdate(noIndex?: boolean): void {
        this.dispatchEvent(new CustomEvent<StopColorList>('update',{
            composed: true,
            bubbles: false,
            detail: this._workingValue.createReadonly(noIndex ? null : this._selectedIndex),
        }));
    }

    private get gradient(): string {
        const value = this.currentValue;
        if (this.edit) {
            return WritableStopColorList.stringifyStopColorList(value.list, true);
        }
        return value.toString();
    }

    private renderHandles(selected: number) {
        const value = this.currentValue;

        if (!value) {
            return null;
        }

        const canFocus = this.focused && !this.disabled && !this.readonly;

        return value.list.map((stop: StopColor, index: number) => html`
                <sp-color-handle
                        ?selected=${index === selected}
                        ?focus=${canFocus && (index === selected)}
                        data-index="${index}"
                        color="${stop.color.rgba}"
                        style="${this.vertical ? 'top' : 'left'}: ${(this.invert ? (1 - stop.offset) : stop.offset) * 100}%"
                        ?disabled=${this.disabled}
                        class="handle"
                ></sp-color-handle>`
        );
    }

    protected render(): TemplateResult {
        return html`
            <div class="checkerboard" role="presentation">
                <div class="gradient" role="presentation" style="background: linear-gradient(to ${this.vertical ? (this.invert ? 'top' : 'bottom') : (this.invert ? 'left' : 'right')}, ${this.gradient});"></div>
            </div>
            ${this.renderHandles(this.selectedIndex)}
        `;
    }

    private onPointerDown(e: PointerEvent) {
        e.preventDefault();

        if (this.readonly || e.button !== 0) {
            return;
        }

        const target = e.composedPath()[0] as HTMLElement;

        if (target.classList.contains('handle')) {
            // probably handle changed
            this.edit = false;
            // we hit a handle, mark it as selected
            this.selectedIndex = parseInt(target.dataset['index']);
        } else {
            if (this.currentValue.length + 1 >= this.maxHandles) {
                // too many handles
                return;
            }

            // we should try to add a new handle
            const offset = this.calculateHandlePosition(e);
            if (this.currentValue.hasOffset(offset)) {
                return;
            }

            this.restartEdit();

            this.selectedIndex = this._workingValue.list.indexOf(this._workingValue.addStopColor(offset));

            this.dispatchEvent(new CustomEvent('add', {
                bubbles: false,
                composed: true,
            }));

            this.dispatchUpdate();
        }

        this.focused = true;
        this.boundingClientRect = this.getBoundingClientRect();

        this.addEventListener('pointermove', this.onPointerMove);
        this.addEventListener('pointerup', this.onPointerUp);

        this.focus();
        this.setPointerCapture(e.pointerId);
    }

    private onPointerMove(e: PointerEvent): void {
        if (this.readonly) {
            return;
        }
        if (this.invert) {
            this.offset = 1 - this.calculateHandlePosition(e);
        } else {
            this.offset = this.calculateHandlePosition(e);
        }
    }

    private onPointerUp(e: PointerEvent): void {
        this.releasePointerCapture(e.pointerId);
        this.removeEventListener('pointermove', this.onPointerMove);
        this.removeEventListener('pointerup', this.onPointerUp);
        this.focused = false;
        this.edit = false;
    }

    private onKeyDown(e: KeyboardEvent) {
        if (!this.focused) {
            return;
        }

        if (e.key === 'Tab') {
            const index = this._selectedIndex + (e.shiftKey ? -1 : 1);
            if (index >= 0 && index < this.currentValue.length) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.selectedIndex = index;
            }
            return;
        }

        e.preventDefault();

        if (this.readonly) {
            return;
        }

        let delta = 0;
        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                this.removeCurrentHandle();
                return;
            case 'Escape':
            case 'Enter':
                this.edit = false;
                this.focused = false;
                return;
            case 'ArrowUp':
                delta = 0.01;
                break;
            case 'ArrowDown':
                delta = -0.01;
                break;
            case 'ArrowLeft':
                delta = this.isLTR ? -0.01 : 0.01;
                break;
            case 'ArrowRight':
                delta = this.isLTR ? 0.01 : -0.01;
                break;
            default:
                return;
        }

        this.focused = true;

        if (e.shiftKey) {
            delta *= 10;
        }

        this.offset += delta;
    }

    public reverseStops(onlyColors?: boolean) {
        this.restartEdit();
        if (onlyColors) {
            this._workingValue.reverseColors();
            this.dispatchUpdate();
        } else {
            const stop = this._workingValue.list[this.selectedIndex];
            this._workingValue.reverseOffsets();
            const index = this._workingValue.list.indexOf(stop);
            this.dispatchUpdate(true);
            this.setSelectedIndex(index, true);
        }

        this.edit = false;
    }

    public removeCurrentHandle() {
        if (this.currentValue.length <= 2) {
            return;
        }

        this.restartEdit();

        const index = this.selectedIndex;
        this._workingValue.removeColorAt(index);

        if (index >= this._workingValue.length) {
            this.selectedIndex = this._workingValue.length - 1;
        }

        this.dispatchEvent(new CustomEvent('remove', {
            bubbles: false,
            composed: true,
        }));

        this.dispatchUpdate();

        this.edit = false;
    }

    private boundingClientRect!: DOMRect;
    private calculateHandlePosition(event: PointerEvent): number {
        /* c8 ignore next 3 */
        if (!this.boundingClientRect) {
            return 0;
        }

        const rect = this.boundingClientRect;
        const minOffset = this.vertical ? rect.top : rect.left;
        const offset = this.vertical ? event.clientY : event.clientX;
        const size = this.vertical ? rect.height : rect.width;

        return Math.max(0, Math.min(1, Math.round(100 * (offset - minOffset) / size) / 100));
    }

    private restartEdit() {
        if (this._edit) {
            this.edit = false;
        }
        this.edit = true;
    }

    private onFocus(): void {
        this.focused = true;
    }

    private onBlur(): void {
        this.edit = false;
        this.focused = false;
    }

    protected firstUpdated(changed: PropertyValues): void {
        super.firstUpdated(changed);
        this.boundingClientRect = this.getBoundingClientRect();

        this.addEventListener('pointerdown', this.onPointerDown);
        this.addEventListener('keydown', this.onKeyDown);
        this.addEventListener('focus', this.onFocus);
        this.addEventListener('blur', this.onBlur);
        this.tabIndex = 0;
    }
}
