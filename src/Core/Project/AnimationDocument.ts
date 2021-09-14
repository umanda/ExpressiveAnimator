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

import {SingleBoardDocument} from "@zindex/canvas-engine";
import {DocumentAnimationMap} from "../Animation";
import type {AnimationProject} from "./AnimationProject";

export class AnimationDocument extends SingleBoardDocument {

    protected _animationMap: DocumentAnimationMap = null;

    get animation(): DocumentAnimationMap | null {
        return this._animationMap;
    }

    set animation(value: DocumentAnimationMap | null) {
        if (value.document !== this) {
            return;
        }

        if (this._animationMap) {
            this._animationMap.dispose();
        }

        this._animationMap = value;

        if (value) {
            value.cleanupAnimatedProperties();
        }
    }

    clone(newId?: boolean): AnimationDocument {
        const clone = super.clone(newId) as AnimationDocument;
        clone._animationMap = this._animationMap?.clone(clone);
        return clone;
    }

    toJSON() {
        const json = super.toJSON();
        json.animationMap = this._animationMap;
        return json;
    }

    static fromJSON(json, project: AnimationProject): AnimationDocument {
        const document = new this(null, json.id);

        document.applyJSON(json);

        if (json.animationMap) {
            document._animationMap = DocumentAnimationMap.create(document, project, json.animationMap);
        }

        return document;
    }
}