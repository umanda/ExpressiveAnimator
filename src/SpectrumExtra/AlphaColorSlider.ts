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

import {BaseColorSlider} from "./BaseColorSlider";
import {property} from "@spectrum-web-components/base";

export class AlphaColorSlider extends BaseColorSlider {
    @property({type: String})
    public template: string = 'rgba(0, 0, 0, %alpha)';

    protected applyTemplate(value: number): string {
        return this.template.replace('%alpha', (value / 100).toFixed(4));
    }

    protected get gradient(): string {
        return `${this.applyTemplate(0)} 0%, ${this.applyTemplate(100)} 100%`;
    }

    protected get handleColor(): string {
        return this.applyTemplate(this.value);
    }
}
