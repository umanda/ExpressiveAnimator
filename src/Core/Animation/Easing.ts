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
import type {JSONSerializable, PointStruct} from "@zindex/canvas-engine";
import {uuid, clamp, isCloseTo, PathNode, PathNodeType, Point} from "@zindex/canvas-engine";

const INVERSE_PREFIX = '\u{200F}'; // RLM

export abstract class Easing implements JSONSerializable {
    readonly id: string;
    protected _title: string;

    protected constructor(id: string, title: string) {
        this.id = id;
        this._title = title;
    }

    get title(): string {
        return this._title;
    }

    get isCustom(): boolean {
        return false;
    }

    abstract get inverse(): Easing;
    abstract split(percent: number): [Easing, Easing];
    abstract value(t: number): number;

    toJSON(): any {
        return null;
    }
}

export class LinearEasing extends Easing {
    protected constructor() {
        super('linear', 'Linear');
    }

    get inverse(): LinearEasing {
        return this;
    }

    split(percent: number): [LinearEasing, LinearEasing] {
        return LinearEasing.SPLIT;
    }

    value(t: number): number {
        if (t <= 0) {
            return 0;
        }
        if (t >= 1) {
            return 1;
        }
        return t;
    }

    toString(): string {
        return 'linear';
    }

    static readonly INSTANCE: LinearEasing = new LinearEasing();
    static readonly SPLIT: [LinearEasing, LinearEasing] = [this.INSTANCE, this.INSTANCE];

    static fromJSON() {
        return this.INSTANCE;
    }
}

export class StepEndEasing extends Easing {
    protected constructor() {
        super('step-end', 'Step End');
    }

    get inverse(): StepStartEasing {
        return StepStartEasing.INSTANCE;
    }

    split(percent: number): [StepEndEasing, StepStartEasing] {
        if (percent >= 1) {
            return [this, StepStartEasing.INSTANCE];
        }
        return StepEndEasing.SPLIT;
    }

    value(t: number): number {
        return t < 1 ? 0 : 1;
    }

    toString(): string {
        return 'step-end';
    }

    static readonly INSTANCE: StepEndEasing = new StepEndEasing();
    static readonly SPLIT: [StepEndEasing, StepEndEasing] = [this.INSTANCE, this.INSTANCE];

    static fromJSON() {
        return this.INSTANCE;
    }
}

export class StepStartEasing extends Easing {
    protected constructor() {
        super('step-start', 'Step Start');
    }

    get inverse(): StepEndEasing {
        return StepEndEasing.INSTANCE;
    }

    split(percent: number): [StepStartEasing, StepStartEasing] {
        return StepStartEasing.SPLIT;
    }

    value(t: number): number {
        return 1;
    }

    toString(): string {
        return 'step-start';
    }

    static readonly INSTANCE: StepStartEasing = new StepStartEasing();
    static readonly SPLIT: [StepStartEasing, StepStartEasing] = [this.INSTANCE, this.INSTANCE];

    static fromJSON() {
        return this.INSTANCE;
    }
}

export class CubicEasing extends Easing {
    public readonly h1: PointStruct;
    public readonly h2: PointStruct;
    protected _inverse: CubicEasing = null;

    private coeff: [PointStruct, PointStruct, PointStruct] = null;
    private solve: (value: number) => number;

    constructor(id: string, title: string, h1: PointStruct, h2: PointStruct) {
        super(id, title);
        this.h1 = h1;
        this.h2 = h2;
        this.refresh();
    }

    get inverse(): CubicEasing {
        return this._inverse;
    }

    split(percent: number): [CubicEasing, CubicEasing] {
        if (this.isLinear) {
            // simple linear splitting
            return CubicLinear.SPLIT;
        }

        percent = Math.round(percent * 100) / 100;

        if (percent <= 0) {
            return [CubicLinear.INSTANCE, this];
        }
        if (percent >= 1) {
            return [this, CubicLinear.INSTANCE];
        }

        const [left, right] = splitCubic(this.h1, this.h2, percent);

        // these temp
        return [
            new CubicEasing(null, null, left[0], left[1]),
            new CubicEasing(null, null, right[0], right[1]),
        ];
    }

    get isLinear(): boolean {
        return this.coeff == null;
    }

    protected refresh(): void {
        const h1 = this.h1;
        const h2 = this.h2;

        if (isCloseTo(h1.x, h1.y) && isCloseTo(h2.x, h2.y)) {
            this.coeff = null;
            this.solve = this.linear;
            return;
        }

        const s1x = h1.x * 3;
        const s1y = h1.y * 3;
        const s2x = h2.x * 3;
        const s2y = h2.y * 3;

        this.coeff = [
            {
                x: 1 + s1x - s2x,
                y: 1 + s1y - s2y,
            },
            {
                x: s2x - 2 * s1x,
                y: s2y - 2 * s1y,
            },
            {
                x: s1x,
                y: s1y,
            },
        ];

        if (isCloseTo(this.coeff[1].x, 0) && isCloseTo(this.coeff[2].x, 0)) {
            this.solve = this.cubicRoot;
        } else {
            this.solve = this.tFromX;
        }
    }

    private linear(x: number): number {
        return x;
    }

    private cubicRoot(x: number): number {
        const t = (x / this.coeff[0].x) ** (1 / 3);
        const cf = this.coeff;
        return ((cf[0].y * t + cf[1].y) * t + cf[2].y) * t;
    }

    private tFromX(x: number): number {
        const a = this.coeff[0].x;
        const b = this.coeff[1].x;
        const c = this.coeff[2].x;

        let t = x;

        for (let i = 0; i < 8; i++) {
            const f = a * t * t * t + b * t * t + c * t - x;

            if (Math.abs(f) <= 0.00005) {
                break;
            }

            // f'
            const fd = 3 * a * t * t + 2 * b * t + c;

            // f''
            const fdd = 6 * a * t + 2 * b;

            t -= (2 * f * fd) / (2 * fd * fd - f * fdd);
        }

        if (t < 0) {
            t = 0;
        } else if (t > 1) {
            t = 1;
        }

        const cf = this.coeff;
        return ((cf[0].y * t + cf[1].y) * t + cf[2].y) * t;
    }

    value(t: number): number {
        if (t <= 0) {
            return 0;
        }
        if (t >= 1) {
            return 1;
        }
        return this.solve(t);
    }

    sameHandles(h1: PointStruct, h2: PointStruct): boolean {
        return h1.x === this.h1.x && h1.y === this.h1.y &&
                h2.x === this.h2.x && h2.y === this.h2.y;
    }

    toArray(): [number, number, number, number] {
        return [this.h1.x, this.h1.y, this.h2.x, this.h2.y];
    }

    toString(): string {
        return `cubic-bezier(${this.h1.x}, ${this.h1.y}, ${this.h2.x}, ${this.h2.y})`;
    }
}

export class CubicEaseIn extends CubicEasing {
    protected constructor() {
        super('ease-in', 'Ease In', {x: 0.42, y: 0.0}, {x: 1.0, y: 1.0});
    }

    get inverse(): CubicEaseOut {
        return CubicEaseOut.INSTANCE;
    }

    static INSTANCE: CubicEaseIn = new CubicEaseIn();

    static fromJSON() {
        return this.INSTANCE;
    }
}

export class CubicEaseOut extends CubicEasing {
    protected constructor() {
        super('ease-out', 'Ease Out', {x: 0.0, y: 0.0}, {x: 0.58, y: 1.0});
    }

    get inverse(): CubicEaseIn {
        return CubicEaseIn.INSTANCE;
    }

    static INSTANCE: CubicEaseOut = new CubicEaseOut();

    static fromJSON() {
        return this.INSTANCE;
    }
}

export class CubicEaseInOut extends CubicEasing {
    protected constructor() {
        super('ease-in-out', 'Ease In Out', {x: 0.42, y: 0.0}, {x: 0.58, y: 1.0});
    }

    get inverse(): CubicEaseInOut {
        return this;
    }

    static INSTANCE: CubicEaseInOut = new CubicEaseInOut();

    static fromJSON() {
        return this.INSTANCE;
    }
}

export class CubicLinear extends CubicEasing {
    protected constructor() {
        super('cubic-linear', 'Cubic Linear', {x: 0.5, y: 0.5}, {x: 0.5, y: 0.5});
    }

    split(percent: number): [CubicEasing, CubicEasing] {
        return CubicLinear.SPLIT;
    }

    get inverse(): CubicLinear {
        return this;
    }

    static readonly INSTANCE: CubicLinear = new CubicLinear();
    static readonly SPLIT: [CubicLinear, CubicLinear] = [this.INSTANCE, this.INSTANCE];

    static fromJSON() {
        return this.INSTANCE;
    }
}

export class CustomCubicEasing extends CubicEasing {
    protected _inverse: CustomCubicEasing = null;

    get isCustom(): boolean {
        return true;
    }

    get isInverse(): boolean {
        return this.id.startsWith(INVERSE_PREFIX);
    }

    get inverse(): CustomCubicEasing {
        return this._inverse;
    }

    set title(value: string) {
        this._title = this._inverse._title = value;
    }

    update(h1: PointStruct | null, h2: PointStruct | null): boolean {
        let changed: boolean = false;

        const inverse = this._inverse;

        if (h1 != null) {
            h1 = clampHandle(h1);
            if (h1.x !== this.h1.x || h1.y !== this.h1.y) {
                this.h1.x = h1.x;
                this.h1.y = h1.y;
                inverse.h2.x = 1 - h1.x;
                inverse.h2.y = 1 - h1.y;
                changed = true;
            }
        }

        if (h2 != null) {
            h2 = clampHandle(h2);
            if (h2.x !== this.h2.x || h2.y !== this.h2.y) {
                this.h2.x = h2.x;
                this.h2.y = h2.y;
                inverse.h1.x = 1 - h2.x;
                inverse.h1.y = 1 - h2.y;
                changed = true;
            }
        }

        if (changed) {
            this.refresh();
            inverse.refresh();
            return true;
        }

        return false;
    }

    toJSON() {
        return {
            id: this.id,
            title: this._title,
            h1: this.h1,
            h2: this.h2,
        };
    }

    static fromJSON(json: {id: string, title: string, h1: PointStruct, h2: PointStruct}, global: {easingManager: EasingManager}) {
        if (global != null && global.easingManager != null) {
            return global.easingManager.findCubic(json.h1, json.h2) || global.easingManager.add(CustomCubicEasing.create(
                json.title,
                json.h1,
                json.h2,
                global.easingManager.getNewId(json.id),
            ));
        }

        return CustomCubicEasing.create(
            json.title,
            json.h1,
            json.h2,
            getId(json.id),
        );
    }

    static create(title: string, h1: PointStruct, h2: PointStruct, id?: string): CustomCubicEasing {
        id = getId(id);

        h1 = clampHandle(h1);
        h2 = clampHandle(h2);

        const easing = new CustomCubicEasing(id, title, h1, h2);
        const inverse = new CustomCubicEasing(INVERSE_PREFIX + id, title, {x: 1 - h2.x, y: 1 - h2.y}, {x: 1 - h1.x, y: 1 - h1.y});

        easing._inverse = inverse;
        inverse._inverse = easing;

        return easing;
    }
}

export class StepsEasing extends Easing {
    protected _steps: number;
    protected _start: boolean;
    protected _inverse: StepsEasing = null;

    protected constructor(id: string, title: string, steps: number, start: boolean = false) {
        super(id, title);
        this._steps = steps;
        this._start = start;
    }

    split(percent: number): [StepStartEasing | StepEndEasing | StepsEasing, StepStartEasing | StepEndEasing | StepsEasing] {
        percent = (percent * 100) / 100;

        const from = Math.round(percent * this._steps);
        const to = this._steps - from;

        if (percent <= 0 || from === 0) {
            if (this._start) {
                return [StepStartEasing.INSTANCE, this];
            }
            return [StepEndEasing.INSTANCE, this];
        }

        if (percent >= 1 || to === 0) {
            if (this._start) {
                return [this, StepStartEasing.INSTANCE];
            }
            return [this, StepEndEasing.INSTANCE];
        }

        if (from === 1) {
            if (to === 1) {
                return this._start
                    ? [StepStartEasing.INSTANCE, StepStartEasing.INSTANCE]
                    : [StepEndEasing.INSTANCE, StepEndEasing.INSTANCE];
            }
            return [
                this._start ? StepStartEasing.INSTANCE : StepEndEasing.INSTANCE,
                new StepsEasing(null, null, to, this._start)
            ];
        }

        if (to === 1) {
            return [
                new StepsEasing(null, null, to, this._start),
                this._start ? StepStartEasing.INSTANCE : StepEndEasing.INSTANCE,
            ];
        }

        return [
            new StepsEasing(null, null, from, this._start),
            new StepsEasing(null, null, to, this._start),
        ];
    }

    get steps(): number {
        return this._steps;
    }

    get start(): boolean {
        return this._start;
    }

    get inverse(): StepsEasing {
        return this._inverse;
    }

    value(t: number): number {
        if (t >= 1) {
            return 1;
        }

        const p = 1 / this._steps;

        if (this._start) {
            t += p;
        }

        return t - t % p;
    }

    toString(): string {
        return `steps(${this._steps}, ${this._start ? 'start' : 'end'})`;
    }
}

export class CustomStepsEasing extends StepsEasing {
    protected _inverse: CustomStepsEasing;

    set steps(value: number) {
        this._steps = value;
        this._inverse._steps = value;
    }

    set start(value: boolean) {
        this._start = value;
        this._inverse._start = !value;
    }

    get isCustom(): boolean {
        return true;
    }

    get isInverse(): boolean {
        return this.id.startsWith(INVERSE_PREFIX);
    }

    get inverse(): CustomStepsEasing {
        return this._inverse;
    }

    set title(value: string) {
        this._title = this._inverse._title = value;
    }

    toJSON(): any {
        return {
            id: this.id,
            title: this._title,
            steps: this.steps,
            start: this.start,
        };
    }

    static fromJSON(json: {id: string, title: string, steps: number, start: boolean}, global: {easingManager: EasingManager}) {
        if (global != null && global.easingManager != null) {
            return global.easingManager.findSteps(json.steps, json.start) || global.easingManager.add(CustomStepsEasing.create(
                json.title,
                json.steps,
                json.start,
                global.easingManager.getNewId(json.id),
            ));
        }

        return CustomStepsEasing.create(
            json.title,
            json.steps,
            json.start,
            getId(json.id),
        );
    }

    static create(title: string, steps: number, start: boolean, id?: string): CustomStepsEasing {
        id = getId(id);

        const easing = new CustomStepsEasing(id, title, steps, start);
        const inverse = new CustomStepsEasing(INVERSE_PREFIX + id, title, steps, !start);

        easing._inverse = inverse;
        inverse._inverse = easing;

        return easing;
    }
}

export class EasingManager {
    protected map: Map<string, Easing> = new Map<string, Easing>();

    constructor() {
        [
            LinearEasing.INSTANCE,
            StepStartEasing.INSTANCE,
            StepEndEasing.INSTANCE,
            CubicEaseInOut.INSTANCE,
            CubicEaseIn.INSTANCE,
            CubicEaseOut.INSTANCE,
        ].forEach(e => this.map.set(e.id, e));
    }

    findCubic(h1: PointStruct, h2: PointStruct): CubicEasing | null {
        h1 = clampHandle(h1);
        h2 = clampHandle(h2);
        for (const e of this.map.values()) {
            if ((e instanceof CubicEasing)) {
                if (e.sameHandles(h1, h2)) {
                    return e;
                }
                if (e.inverse.sameHandles(h1, h2)) {
                    return e.inverse;
                }
            }
        }

        return null;
    }

    findSteps(steps: number, start: boolean): StepsEasing | null {
        for (const e of this.map.values()) {
            if ((e instanceof StepsEasing) && e.steps === steps) {
                return e.start === start ? e : e.inverse;
            }
        }

        return null;
    }

    has(id: string): boolean {
        return this.map.has(removeInversePrefix(id));
    }

    get(id: string): Easing | null {
        id = removeInversePrefix(id);
        return this.map.has(id) ? this.map.get(id) : null;
    }

    remove(id: string): boolean {
        id = removeInversePrefix(id);

        if (!this.map.has(id)) {
            return false;
        }

        this.map.delete(id);

        return true;
    }

    add(easing: Easing): Easing {
        if (easing.id.startsWith(INVERSE_PREFIX)) {
            easing = easing.inverse;
        }
        this.map.set(easing.id, easing);
        return easing;
    }

    getNewId(id?: string | null): string {
        if (id == null) {
            return getId();
        }
        id = removeInversePrefix(id);
        return this.map.has(id) ? getId() : id;
    }

    addFromJSON(json: {id: string, title: string, h1?: PointStruct, h2?: PointStruct, steps?: number, start?: boolean}): Easing | null {
        let easing = null;

        if (json.h1 != null && json.h2 != null) {
            easing = CustomCubicEasing.create(json.title, json.h1, json.h2, this.getNewId(json.id));
        } else if (json.steps != null) {
            easing = CustomStepsEasing.create(json.title, json.steps, !!json.start, this.getNewId(json.id));
        }

        return easing ? this.add(easing) : null;
    }

    * custom(): Generator<CustomCubicEasing | CustomStepsEasing> {
        for (const value of this.map.values()) {
            if ((value instanceof CustomCubicEasing) || (value instanceof CustomStepsEasing)) {
                yield value;
            }
        }
    }

    [Symbol.iterator](): Iterator<Easing> {
        return this.map.values();
    }
}

function splitCubic(h1: PointStruct, h2: PointStruct, percent: number): [[PointStruct, PointStruct], [PointStruct, PointStruct]] {
    const [from, middle, to] = PathNode.createNodeBetween(
        PathNode.create(PathNodeType.Node, Point.ZERO, null, Point.fromObject(h1)),
        PathNode.create(PathNodeType.Node, Point.UNIT, Point.fromObject(h2), null),
        percent
    );

    const one = middle.moveTo(1, 1);
    const zero = middle.moveTo(0, 0);

    return [
        [
            clampHandle({x: from.handleOut.x, y: from.handleOut.y}),
            clampHandle({x: one.handleIn.x, y: one.handleIn.y}),
        ],
        [
            clampHandle({x: zero.handleOut.x, y: zero.handleOut.y}),
            clampHandle({x: to.handleIn.x, y: to.handleIn.y}),
        ],
    ];
}

function clampHandle(handle: PointStruct): PointStruct {
    handle.x = clamp(handle.x, 0, 1);
    handle.y = clamp(handle.y, 0, 1);
    return handle;
}

function removeInversePrefix(id: string): string {
    if (id.startsWith(INVERSE_PREFIX)) {
        return id.substr(INVERSE_PREFIX.length);
    }
    return id;
}

function getId(id?: string | null): string {
    if (id == null) {
        return uuid();
    }
    return removeInversePrefix(id);
}
