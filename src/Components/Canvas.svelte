<script lang="ts">
    import {onMount, onDestroy, tick} from "svelte";
    import type {KeyframeSelection, AnimationDocument} from "../Core";
    import type {CanvasEngine, Selection, SnappingOptions} from "@zindex/canvas-engine";

    import {
        CurrentTool, CurrentTheme, CurrentTime,
        CanvasEngineState, CurrentProject, CurrentDocument,
        CurrentCanvasZoom, CurrentGlobalElementProperties,
        CurrentNumberUnit, IsPlaying,
        notifyAnimationChanged,
        notifyPropertiesChanged,
        notifyStateChanged,
        notifySelectionChanged,
    } from "../Stores";

    const {showRuler, showGuides, lockGuides, showGrid, showGridToBack, highQuality, snapping} = CanvasEngineState;

    export let hidden: boolean = false;

    let canvas: CanvasEngine;

    $: if (canvas) canvas.allowTool = !$IsPlaying;
    $: if (canvas) hidden ? canvas.stopRenderLoop() : canvas.startRenderLoop();
    $: if (canvas) canvas.setAttribute('theme', $CurrentTheme);
    $: if (canvas) canvas.tool = $CurrentTool;
    $: if (canvas) canvas.showRuler = $showRuler;
    $: if (canvas) canvas.showGuides = $showGuides;
    $: if (canvas) canvas.lockGuides = $lockGuides;
    $: if (canvas) canvas.showGrid = $showGrid;
    $: if (canvas) canvas.showGridToBack = $showGridToBack;
    $: if (canvas) canvas.highQuality = $highQuality;
    $: if (canvas) setSnapping(canvas, $snapping as SnappingOptions);
    $: {
        if (canvas && $CurrentProject && $CurrentProject.middleware.setTime($CurrentTime)) {
            canvas.invalidate();
            notifyPropertiesChanged();
        }
    }

    function setSnapping(canvas: CanvasEngine, options: SnappingOptions) {
        const snap = canvas.snappingOptions;
        snap.enabled = options.enabled;
        snap.grid = options.grid;
        snap.pixel = options.pixel;
        snap.guides = options.guides;
        snap.bounds = options.bounds;
        snap.points = options.points;
        snap.contours = options.contours;
        snap.tolerance = options.tolerance;
    }


    onMount(() => {
        canvas.preventSurfaceDisposal();
        canvas.globalElementProperties = CurrentGlobalElementProperties;
        canvas.setAttribute('theme', $CurrentTheme);
        canvas.highQuality = $highQuality;
        canvas.showRuler = $showRuler;
        canvas.showGuides = $showGuides;
        canvas.lockGuides = $lockGuides;
        canvas.showGrid = $showGrid;
        canvas.showGridToBack = $showGridToBack;

        canvas.tool = $CurrentTool;
        canvas.allowSurfaceDisposal();

        canvas.project = $CurrentProject;

        CurrentProject.forceUpdate();
        return CurrentProject.subscribe(p => {
            canvas.project = p;
        });
    });

    onDestroy(() => {
        canvas.project = null;
        canvas.dispose();
    });

    function beforeWindowUnload() {
        if (canvas) {
            canvas.dispose();
            // removing the canvas from dom
            canvas.parentNode.removeChild(canvas);
            canvas = null;
        }
    }

    async function onZoomChanged(e: CustomEvent<number>) {
        await tick();
        $CurrentCanvasZoom = e.detail;
    }

    async function onPropertiesChanged() {
        await tick();
        notifyPropertiesChanged();
    }

    async function onSnapshotCreated(e: CustomEvent) {
        await tick();
        //notifyStateChanged();
        CurrentProject.forceUpdate();
    }

    async function onSelectionChanged(e: CustomEvent<Selection<AnimationDocument>>) {
        await tick();
        notifySelectionChanged();
    }

    async function onKeyframeSelectionChanged(e: CustomEvent<KeyframeSelection>) {
        await tick();
        // TODO: update keyframe selection
        console.log('update keyframe selection')
    }

    async function onKeyframeAdded(e: CustomEvent) {
        await tick();
        notifyAnimationChanged();
    }

    async function onDocumentStateChanged() {
        await tick();
        CurrentProject.forceUpdate();
    }

    async function onDocumentChanged(e: CustomEvent<AnimationDocument>) {
        if ($CurrentDocument === e.detail) {
            return;
        }
        await tick();
        // TODO:
    }

    async function onDocumentAdded(e: CustomEvent<AnimationDocument>) {
        await tick();
        // TODO:
    }

    async function onDocumentRemoved(e: CustomEvent<{document: AnimationDocument, dispose: boolean}>) {
        await tick();
        // TODO:
    }

    async function onTreeChanged() {
        await tick();
        CurrentProject.forceUpdate();
    }
</script>
<svelte:window on:beforeunload={beforeWindowUnload}/>
<div class="canvas-wrapper">
    <canvas-engine
            tabindex="0"
            class:hidden={hidden} bind:this={canvas}

            on:zoomChanged={onZoomChanged}
            on:documentAdded={onDocumentAdded}
            on:documentRemoved={onDocumentRemoved}
            on:documentChanged={onDocumentChanged}
            on:documentStateChanged={onDocumentStateChanged}
            on:selectionChanged={onSelectionChanged}
            on:propertyChanged={onPropertiesChanged}
            on:snapshotCreated={onSnapshotCreated}
            on:treeChanged={onTreeChanged}

            on:keyframeAdded={onKeyframeAdded}
            on:keyframeSelectionChanged={onKeyframeSelectionChanged}
    >
        <span slot="unit">{$CurrentNumberUnit}</span>
    </canvas-engine>
    {#if hidden}
        <slot />
    {/if}
</div>
<style>
    .canvas-wrapper {
        box-sizing: border-box;
        overflow: hidden;
        background: var(--separator-color);
        outline: none !important;
    }

    canvas-engine {
        touch-action: none;
        outline: none !important;
    }

    canvas-engine.hidden {
        display: none;
    }
</style>