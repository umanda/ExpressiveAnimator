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

import {writable} from "svelte/store";
import {setting} from "./utils";

export enum TimelineFilterMode {
    // select or animated
    AllSelectedOrAnimated = 0,
    // only animated
    OnlyAnimated = 1,
    // only selected that are animated
    OnlySelectedAndAnimated= 2,
    // only selected (must not be animated)
    OnlySelected = 3,
}

export const IsFillSelected = writable<boolean>(true);
export const IsProjectSaved = writable<boolean>(false);
export const IsPlaying = writable<boolean>(false);
export const ProjectFileHandle = writable<FileSystemFileHandle>(null);
export const TimelineIsWorking = writable<boolean>(false);

export const CurrentTheme = setting<"dark" | "light">("layout", "theme");
export const ShowTreeReverse = setting<boolean>("tree", "reverse");
export const CurrentTimelineFilterMode = setting<TimelineFilterMode>("timeline", "filter");
export const TimelineFollowMode = setting<boolean>("timeline", "follow");

export const CurrentColorMode = setting<string>("properties", "colorMode");
export const IsGradientPinned = setting<boolean>("properties", "pinnedGradient");
export const ProportionalScale = setting<boolean>("properties", "proportionalScale");
export const StrokeDashPercent = setting<boolean>("properties", "strokeDashPercent");
export const ProportionalSize = setting<boolean>("properties", "proportionalSize");
