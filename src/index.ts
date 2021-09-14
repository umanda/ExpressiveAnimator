import "./spectrum";
import "./style.css";
import "./scroll.css";

// extra spectrum controls
import "./SpectrumExtra";

import {loadIconSet} from "./LoadIcons";
import App from './App.svelte';

// Prevent typescript errors
//@ts-ignore
import CustomIcons from "./icons.svg";
//@ts-ignore
import AdobeWorkflowIcons from "./workflow-icons.svg";

import "@adobe/focus-ring-polyfill";

import {CanvasEngineInit} from "@zindex/canvas-engine";
import {getSampleProject} from "./doc1";
import {patchSpectrum} from "./patchSpectrum";
import {setNewProject} from "./actions";
import "./hotkeys";

export default LoadApp();

async function LoadApp() {
    await CanvasEngineInit({
        defaultFont: document.querySelector('meta[name="expressive:default-font"]').getAttribute('content')
    });
    await patchSpectrum();
    await loadIconSet('expr', CustomIcons);
    await loadIconSet('workflow', AdobeWorkflowIcons);

    await setNewProject(await getSampleProject());

    const app = new App({
        target: document.body,
        props: {},
    });

    return app;
}
