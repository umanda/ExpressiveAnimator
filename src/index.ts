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
import {CurrentProject} from "./Stores";
import {getSampleProject} from "./doc1";
import {patchSpectrum} from "./patchSpectrum";

export default LoadApp();

async function LoadApp() {
    await CanvasEngineInit({
        defaultFont: document.querySelector('meta[name="expressive:default-font"]').getAttribute('content')
    });
    await patchSpectrum();
    await loadIconSet('expr', CustomIcons);
    await loadIconSet('workflow', AdobeWorkflowIcons);

    const project = await getSampleProject();
    CurrentProject.set(project);

    const app = new App({
        target: document.body,
        props: {},
    });

    setTimeout(() => {
        project.engine.viewBox.zoomFit(project.document.localBounds, project.engine.boundingBox, 20);
        window.dispatchEvent(new CustomEvent('expressive-animator-ready', {detail: app}));
    }, 2000);


    return app;
}
