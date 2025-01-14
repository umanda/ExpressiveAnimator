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

import {MouseButton} from "@zindex/canvas-engine";

export function formatNumber(value: number, digits: number): string {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
        return '';
    }
    if (Number.isInteger(value)) {
        return value.toFixed(0);
    }
    return (+value.toFixed(digits)).toString();
}

export function clampStep(value: number, min: number, max: number, step: number = 1): number {
    if (isNaN(value) || value <= min) {
        return min;
    }

    if (value >= max) {
        return max;
    }

    if (step != null) {
        if (step === 1 || step === -1) {
            return Math.round(value);
        }
        if (!Number.isInteger(value / step)) {
            // value = Math.round(value * 1000000000) / 1000000000;
            return value - (value % step);
        }
    }

    return value;
}

export function getPercentage(value: number, min: number, max: number): number {
    return Math.round((value - min) / (max - min) * 10000) / 100;
}

export function getPercentValue(percent: number, min: number, max: number): number {
    return (max - min) * percent + min;
}

export function mergeClasses(...cls): string | null {
    if (!cls.length) {
        return null;
    }

    const ret = [];

    for (let c of cls) {
        c = parseClass(c);
        if (c == null || c.length === 0) {
            continue;
        }
        for (const v of c) {
            if (!ret.includes(v)) {
                ret.push(v);
            }
        }
    }

    return ret.length === 0 ? null : ret.join(' ');
}

function isString(data: any): boolean {
    return typeof data === 'string';
}

function trim(data: string): string {
    return data.trim();
}

function parseClass(cls: any): string[] | null {
    switch (typeof cls) {
        case 'string':
            cls = cls.trim();
            if (cls === '') {
                return null;
            }
            if (cls.indexOf(' ') === -1) {
                return [cls];
            }
            return cls.split(' ');
        case 'function':
            return parseClass(cls());
        case 'object':
            if (Array.isArray(cls)) {
                return cls.filter(isString).map(trim);
            }
            let obj = [];
            for (const p in cls) {
                if (cls.hasOwnProperty(p) && cls[p]) {
                    if (typeof cls[p] === 'string') {
                        obj.push(p + cls[p]);
                    } else {
                        obj.push(p);
                    }
                }
            }
            return obj.length > 0 ? obj : null;
    }

    return null;
}

export function getXYPercent(e: PointerEvent, bbox: DOMRect): {x: number, y: number} {
    return {
        x: clampStep((e.clientX - bbox.left) / bbox.width, 0, 1, null),
        y: clampStep((e.clientY - bbox.top) / bbox.height, 0, 1, null),
    };
}

export const DPI: number = 96.0;
export const NUMBER_STYLE = {
    'in': {
        mul: 1 / DPI,
        style: 'unit',
        unit: 'inch',
        unitDisplay: 'short',
        useGrouping: false,
    },
    'mm': {
        mul: 25.4 / DPI,
        style: 'unit',
        unit: 'millimeter',
        unitDisplay: 'short',
        useGrouping: false,
    },
    'cm': {
        mul: 2.54 / DPI,
        style: 'unit',
        unit: 'centimeter',
        unitDisplay: 'short',
        useGrouping: false,
    },
    'deg': {
        mul: 1,
        style: 'unit',
        unit: 'degree',
        unitDisplay: 'short',
        useGrouping: false,
    },
    'decimal': {
        mul: 1,
        style: 'decimal',
        useGrouping: false,
    },
    'percent': {
        mul: 1,
        style: 'percent',
        useGrouping: false,
    },
    "ms": {
        mul: 1,
        style: 'unit',
        unit: 'millisecond',
        unitDisplay: 'short',
        useGrouping: false,
    },
}

export function getNumberFormatOptions(style: string | object | null): object & {mul?: number} {
    if (!style) {
        return NUMBER_STYLE.decimal;
    }
    if (typeof style === 'string') {
        return (style in NUMBER_STYLE) ? NUMBER_STYLE[style] : NUMBER_STYLE.decimal;
    }
    return style;
}

export function isInvalidNumber(value: number): boolean {
    return isNaN(value) || !isFinite(value);
}

export function fixNumber(number: number, min: number, max: number, scale: number = 1, decimals: number = 3): number {
    number /= scale;

    if (decimals <= 0) {
        number = Math.round(number);
    } else {
        const p = 10 ** decimals;
        number = Math.round(number * p) / p;
    }

    if (min != null && number < min) {
        return min;
    }
    if (max != null && number > max) {
        return max;
    }

    return number;
}

export function getScaled(value: number, scale: number): number {
    if (value == null || scale === 1) {
        return value;
    }
    return scale * value;
}

export function dragAction(node: HTMLElement, params) {
    let surface: HTMLElement = params?.surface,
        move: ((value: {x: number, y: number}, e?: PointerEvent, meta?: any) => void) = params?.move,
        start: (value: {x: number, y: number}, e?: PointerEvent, meta?: any) => void = params?.start,
        end: (changed: boolean, value: {x: number, y: number}, e?: PointerEvent, meta?: any) => void = params?.end,
        raw: boolean = params?.raw,
        filter: (node: HTMLElement) => boolean = params?.filter,
        onlySelf: boolean = params?.onlySelf
    ;

    let last: {x: number, y: number, bbox?: DOMRect};
    let original: {x: number, y: number, bbox?: DOMRect};
    let bbox: DOMRect;

    const onPointerMove = (e: PointerEvent) => {
        if (!e.isPrimary) {
            return;
        }
        const value = raw ? {x: e.clientX, y: e.clientY, bbox} : getXYPercent(e, bbox);
        if (last.x !== value.x || last.y !== value.y) {
            last = value;
            move && move(value, e, node);
        }
    };

    const onPointerUp = (e: PointerEvent = null) => {
        if (!e.isPrimary) {
            return;
        }
        const target = onlySelf ? node : surface;
        target.removeEventListener('pointermove', onPointerMove);
        target.removeEventListener('pointerup', onPointerUp);
        if (e) {
            surface.releasePointerCapture(e.pointerId);
        }

        end && end(original.x !== last.x || original.y !== last.y, last, e, node);
        bbox = original = last = null;
        node.removeAttribute('focus');
        node.blur();
    };

    const onPointerDown = (e: PointerEvent) => {
        if (!e.isPrimary || e.button !== MouseButton.Left) {
            return;
        }
        if (filter != null && !filter(node)) {
            return;
        }
        bbox = surface.getBoundingClientRect();
        original = last = raw ? {x: e.clientX, y: e.clientY, bbox} : getXYPercent(e, bbox);
        start && start(original, e, node);
        if (e.defaultPrevented) {
            return;
        }
        const target = onlySelf ? node : surface;
        target.addEventListener('pointermove', onPointerMove);
        target.addEventListener('pointerup', onPointerUp);
        node.focus();
        node.setAttribute('focus', '');
        surface.setPointerCapture(e.pointerId);
        e.stopPropagation();
    }

    let added = false;
    if (surface) {
        added = true;
        (onlySelf ? surface : node).addEventListener('pointerdown', onPointerDown);
    }

    return {
        update(params) {
            surface = params?.surface;
            start = params?.start;
            end = params?.end;
            move = params?.move;
            raw = params?.raw;
            filter = params?.filter;
            onlySelf = params?.onlySelf;
            if (surface && !added) {
                (onlySelf ? node : surface).addEventListener('pointerdown', onPointerDown);
                added = true;
            }
        },
        destroy() {
            if (bbox) {
                onPointerUp();
            }
        },
    };
}

export function blurOrCallback(el: HTMLElement, callback: () => any) {
    if (el != null && el.ownerDocument.activeElement === el) {
        el.blur();
    } else {
        callback();
    }
}

let id = 0;

export function nextId(): number {
    return id++;
}
