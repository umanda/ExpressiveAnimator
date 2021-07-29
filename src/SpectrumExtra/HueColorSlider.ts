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

export class HueColorSlider extends BaseColorSlider {
    constructor() {
        super();
        this.min = 0;
        this.max = 360;
        this.step = 1;
    }

    protected get gradient(): string {
        return "rgb(255, 0, 0), rgb(255, 255, 0), rgb(0, 255, 0), rgb(0, 255, 255), rgb(0, 0, 255), rgb(255, 0, 255), rgb(255, 0, 0)";
    }

    protected get handleColor(): string {
        return `hsl(${this.value}, 100%, 50%)`;
    }
}
