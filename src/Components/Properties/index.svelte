<script lang="ts">
    import Transform from "./Transform.svelte";
    import {
        CurrentProject,
        CurrentSelectedElement,
        CurrentDocument,
        CurrentNumberUnit,
        IsFillSelected,
        ProportionalScale,
        ProportionalSize,
        StrokeDashPercent,
        CurrentTool,
        IsPlaying,
    } from "../../Stores";
    import Compositing from "./Compositing.svelte";
    import FillAndStroke from "./FillAndStroke";
    import {VectorElement, ShapeBuilderTool, Tool} from "@zindex/canvas-engine";
    import type {GlobalElementProperties} from "@zindex/canvas-engine";
    import DocumentProps from "./DocumentProps.svelte";
    import ElementProps from "./ElementProps";
    import {onDestroy, tick} from "svelte";
    import {PropertyUpdater} from "./PropertyUpdater";
    import type {ActionInfo, PropertyInfo} from "./PropertyUpdater";

    let globalProperties: GlobalElementProperties;
    $: globalProperties = $CurrentProject.engine?.globalElementProperties;

    const updater = new PropertyUpdater();
    onDestroy(() => updater.dispose());

    function onEnd() {
        updater.endUpdate();
    }

    function onStart(e: CustomEvent<PropertyInfo>) {
        updater.startUpdate(e.detail);
    }

    function onUpdate(e: CustomEvent<PropertyInfo>) {
        updater.update(e.detail);
    }

    function onAction(e: CustomEvent<ActionInfo>) {
        updater.callAction(e.detail);
    }

    function onGlobalPropertiesUpdate(e: CustomEvent<PropertyInfo>) {
        updater.updateGlobalProperty(e.detail);
        // force update
        globalProperties = globalProperties;
    }

    function onGlobalPropertiesAction(e: CustomEvent<{type: string, value: any}>) {
        if (updater.callGlobalElementAction(e.detail)) {
            // force update
            globalProperties = globalProperties;
        }
    }

    function onDocumentProperty(e: CustomEvent<PropertyInfo>) {
        updater.updateDocumentProperty(e.detail);
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
                    />
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
                    />
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