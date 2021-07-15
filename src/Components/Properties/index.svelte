<script lang="ts">
    import Transform from "./Transform.svelte";
    import {
        CurrentProject,
        CurrentSelectedElement,
        CurrentDocument,
        CurrentNumberUnit,
        IsFillSelected,
        CurrentColorMode,
        ProportionalScale,
        ProportionalSize,
        StrokeDashPercent,
        CurrentTool,
        IsPlaying,
        notifyPropertiesChanged,
    } from "../../Stores";
    import Compositing from "./Compositing.svelte";
    import FillAndStroke from "./FillAndStroke";
    import {AnimationProject, KeyframeCounter} from "../../Core";
    import {equals, VectorElement, ShapeBuilderTool, Tool} from "@zindex/canvas-engine";
    import type {Element, GlobalElementProperties} from "@zindex/canvas-engine";
    import DocumentProps from "./DocumentProps.svelte";
    import ElementProps from "./ElementProps";
    import {tick} from "svelte";

    let globalProperties: GlobalElementProperties;
    $: globalProperties = $CurrentProject.engine?.globalElementProperties;

    const keyframeCounter = new KeyframeCounter();
    let started: boolean = false;
    let currentPropertyName: string = undefined;
    let currentPropertyValue: any = undefined;
    let currentPropertyType: string = undefined;
    let initialPropertyValue: any = undefined;

    type PropertyInfo = {property: string, value: any, type?: string};

    const debug: boolean = false;

    function isSameProperty(info: PropertyInfo): boolean {
        return currentPropertyName === info.property && currentPropertyType == info.type;
    }

    function onEnd() {
        if (!started) {
            return;
        }

        debug && console.log('stop', currentPropertyName, currentPropertyType);

        const engine = $CurrentProject.engine;
        if ((currentPropertyValue !== undefined && !equals(initialPropertyValue, currentPropertyValue)) || keyframeCounter.hasChanged(engine)) {
            snapshot(false);
            debug && console.log('snapshot', currentPropertyName, currentPropertyType);
        }

        started = false;
        currentPropertyName = undefined;
        currentPropertyType = undefined;
        currentPropertyValue = undefined;
        initialPropertyValue = undefined;
    }

    function onStart(e: CustomEvent<PropertyInfo>) {
        const engine = $CurrentProject.engine;
        debug && console.log('start', e.detail);
        if (started) {
            if (!isSameProperty(e.detail)) {
                // finish current started if different property (if any)
                onEnd();
            }
        }

        started = true;
        currentPropertyName = e.detail.property;
        currentPropertyType = e.detail.type;
        initialPropertyValue = e.detail.value;
        currentPropertyValue = undefined;
        keyframeCounter.start(engine);
    }

    function getElementFilter(type: string) {
        if (!type) {
            return null;
        }
        return (e: Element) => e.type === type;
    }

    function updateProperty(info: PropertyInfo, doSnapshot?: boolean) {
        const project = $CurrentProject;
        if (project.middleware.setElementsProperty(project.selection, info.property as any, info.value, getElementFilter(info.type))) {
            if (doSnapshot) {
                snapshot(false);
            } else {
                notifyPropertiesChanged();
            }
            project.engine.invalidate();
            debug && console.log('update', info);
            return true;
        }
        return false;
    }

    function onUpdate(e: CustomEvent<PropertyInfo>) {
        if (!isSameProperty(e.detail)) {
            onEnd();
        }

        if (!started) {
            updateProperty(e.detail, true);
            return;
        }

        if (!equals(currentPropertyValue, e.detail.value)) {
            currentPropertyValue = e.detail.value;
            updateProperty(e.detail, false);
        }
    }

    function onAction(e: CustomEvent<{ action: (project: AnimationProject, element: Element, value: any) => boolean, value?: any }>) {
        onEnd();

        const project = $CurrentProject;
        keyframeCounter.start(project.engine);
        let changed: boolean = false;

        for (const element of project.selection) {
            if (e.detail.action(project, element, e.detail.value)) {
                changed = true;
            }
        }

        if (changed || keyframeCounter.hasChanged(project.engine)) {
            snapshot();
        }
    }

    function snapshot(invalidate: boolean = true) {
        const project = $CurrentProject;
        if (!project.selection.isEmpty) {
            globalProperties.updateFromElement(project.selection.activeElement);
        }
        project.state.snapshot();
        invalidate && project.engine?.invalidate();
    }

    function onGlobalPropertiesUpdate(e: CustomEvent<PropertyInfo>) {
        if (e.detail.type != null) {
            globalProperties.updateSpecificElementProperty(e.detail.type, e.detail.property, e.detail.value);
        } else {
            globalProperties.updateProperty(e.detail.property, e.detail.value);
        }
        // force update
        globalProperties = globalProperties;
    }

    function onGlobalPropertiesAction(e: CustomEvent<{ action: any, type?: string, value?: any }>) {
        if (!e.detail.type) {
            return;
        }

        switch (e.detail.type) {
            case 'copyFill':
                globalProperties.strokeBrush = globalProperties.fill;
                if (!e.detail.value) {
                    globalProperties.strokeOpacity = globalProperties.fillOpacity;
                }
                return;
            case 'copyStroke':
                globalProperties.fill = globalProperties.strokeBrush;
                if (!e.detail.value) {
                    globalProperties.fillOpacity = globalProperties.strokeOpacity;
                }
                return;
            case 'swapFillStroke':
                const fill = globalProperties.fill;
                globalProperties.fill = globalProperties.strokeBrush;
                globalProperties.strokeBrush = fill;
                if (e.detail.value) {
                    const op = globalProperties.fillOpacity;
                    globalProperties.fillOpacity = globalProperties.strokeOpacity;
                    globalProperties.strokeOpacity = op;
                }
                return;
            case 'splitRadius':
                const radius = globalProperties.getSpecificProperty('rect', 'radius', false);
                globalProperties.updateSpecificElementProperty('rect', 'radius', e.detail.value ? radius.join() : radius.split());
                // force update
                globalProperties = globalProperties;
                return;
        }
    }

    function onDocumentProperty(e: CustomEvent<PropertyInfo>) {
        const document = $CurrentDocument;
        if (!document) {
            return;
        }

        const {property, value, type} = e.detail;
        const obj = type === 'animation' ? document.animation : document;

        if (!(property in obj) || equals(obj[property], value)) {
            return;
        }

        obj[property] = value;

        snapshot();
    }

    let isShapeTool: boolean = false;

    async function checkIfShape(tool: Tool) {
        await tick();
        isShapeTool = tool instanceof ShapeBuilderTool;
    }

    $: checkIfShape($CurrentTool);

    let tab: string = 'appearance';

    function onTabChange(e: Event) {
        const newTab = (e.target as any).selected as string;
        if (tab === newTab || newTab === 'effects') {
            e.preventDefault();
            return false;
        }
        onEnd();
        tab = newTab;
        return true;
    }
</script>
<sp-tabs selected="{tab}" compact on:change|self={onTabChange}>
    <sp-tab label="Appearance" value="appearance"></sp-tab>
    <sp-tab label="Properties" value="properties"></sp-tab>
    <sp-tab label="Effects" value="effects" disabled></sp-tab>
    <sp-tab-panel value="appearance" class="scroll" hidden-x>
        {#if tab === 'appearance'}
            {#if $CurrentSelectedElement == null}
                {#if globalProperties != null}
                    <FillAndStroke
                            on:action={onGlobalPropertiesAction} on:update={onGlobalPropertiesUpdate}
                            value={globalProperties}
                            unit={$CurrentNumberUnit}
                            readonly={$IsPlaying}
                            bind:dashesPercent={$StrokeDashPercent}
                            bind:showFill={$IsFillSelected}
                            bind:colorMode={$CurrentColorMode} />
                    <Compositing on:action={onGlobalPropertiesAction} on:update={onGlobalPropertiesUpdate}
                                 element={globalProperties} readonly={$IsPlaying} />
                {/if}
            {:else}
                {#if $CurrentSelectedElement instanceof VectorElement}
                    <FillAndStroke
                            on:action={onAction} on:start={onStart} on:update={onUpdate} on:end={onEnd}
                            value={$CurrentSelectedElement}
                            unit={$CurrentNumberUnit}
                            readonly={$IsPlaying}
                            bind:dashesPercent={$StrokeDashPercent}
                            bind:showFill={$IsFillSelected}
                            bind:colorMode={$CurrentColorMode} />
                {/if}
                <Compositing on:action={onAction} on:start={onStart} on:update={onUpdate} on:end={onEnd}
                         element={$CurrentSelectedElement} readonly={$IsPlaying} />
            {/if}
        {/if}
    </sp-tab-panel>
    <sp-tab-panel value="properties" class="scroll" hidden-x>
        {#if tab === 'properties'}
            {#if $CurrentSelectedElement == null}
                {#if isShapeTool}
                    <ElementProps
                            on:action={onGlobalPropertiesAction} on:update={onGlobalPropertiesUpdate}
                            value={globalProperties.getSpecificElementProperties($CurrentTool.name)}
                            unit={$CurrentNumberUnit}
                            type={$CurrentTool.name}
                            readonly={$IsPlaying}
                    />
                    <Transform
                            element={null}
                            bind:proportionalScale={$ProportionalScale}
                            readonly={true}
                            unit={$CurrentNumberUnit}
                    />
                {:else if $CurrentDocument}
                    <DocumentProps value={$CurrentDocument} on:update={onDocumentProperty}
                                   bind:proportionalSize={$ProportionalSize} unit={$CurrentNumberUnit}
                                   readonly={$IsPlaying}
                    />
                {/if}
            {:else}
                {#if isShapeTool && $CurrentSelectedElement.type !== $CurrentTool.name}
                    <ElementProps
                            on:action={onGlobalPropertiesAction} on:update={onGlobalPropertiesUpdate}
                            value={globalProperties.getSpecificElementProperties($CurrentTool.name)}
                            unit={$CurrentNumberUnit}
                            type={$CurrentTool.name}
                            readonly={$IsPlaying}
                    />
                {:else}
                    <ElementProps
                            on:action={onAction} on:start={onStart} on:update={onUpdate} on:end={onEnd}
                            unit={$CurrentNumberUnit}
                            value={$CurrentSelectedElement}
                            type={$CurrentSelectedElement.type}
                            readonly={$IsPlaying}
                    />
                {/if}
                <Transform on:action={onAction} on:start={onStart} on:update={onUpdate} on:end={onEnd}
                           element={$CurrentSelectedElement}
                           bind:proportionalScale={$ProportionalScale}
                           readonly={$IsPlaying}
                           unit={$CurrentNumberUnit}
                />
            {/if}
        {/if}
    </sp-tab-panel>
    <sp-tab-panel value="effects" class="scroll" hidden-x></sp-tab-panel>
</sp-tabs>
<style>
    sp-tabs {
        overflow: hidden;
        display: flex;
        flex-direction: column;
        --spectrum-tabs-m-focus-ring-padding-x: var(--spectrum-global-dimension-size-150);
        --spectrum-tabs-rule-color: var(--separator-color);
    }
    sp-tab-panel.scroll {
        --property-group-gap: var(--spectrum-global-dimension-size-100);
        outline: none !important;
        flex: 1;
        line-height: normal;
        padding-top: var(--spectrum-global-dimension-size-200);
        padding-bottom: var(--spectrum-global-dimension-size-200);
    }
    sp-tab-panel.scroll:not([selected]) {
        display: none !important;
    }
</style>