<script lang="ts">
    import type {TwoPointGradientBrush, Point, Rectangle} from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";
    import Gradient from "./Gradient.svelte";
    import RadiusProperty from "./RadiusProperty.svelte";
    import PropertyGroup from "../PropertyGroup.svelte";
    import PropertyItem from "../PropertyItem.svelte";
    import RelativePosition from "../RelativePosition.svelte";
    import PropertyAction from "../PropertyAction.svelte";
    import type {Writable} from "svelte/store";

    const dispatch = createEventDispatcher();

    export let value: TwoPointGradientBrush;
    export let absolute: Writable<boolean>;
    export let readonly: boolean = false;
    export let bounds: Rectangle = undefined;

    function onStartUpdate(e: CustomEvent<Point>) {
        dispatch('update', value.withStart(e.detail));
    }

    function onStartRadiusUpdate(e: CustomEvent<number>) {
        dispatch('update', value.withStart(null, e.detail));
    }

    function onEndUpdate(e: CustomEvent<Point>) {
        dispatch('update', value.withEnd(e.detail));
    }

    function onEndRadiusUpdate(e: CustomEvent<number>) {
        dispatch('update', value.withEnd(null, e.detail));
    }

    let open: boolean;
</script>
<Gradient bind:open value={value} readonly={readonly} on:start on:update on:end bind:isPinned={$absolute} disablePin={bounds == null}>
    {#if open}
        <PropertyGroup title="Radial gradient with focal point">
            <PropertyItem title="Center">
                <RelativePosition on:start on:end on:update={onEndUpdate} value={value.end} absolute={$absolute} readonly={readonly} bounds={bounds} />
            </PropertyItem>
            <PropertyItem title="Radius">
                <div style="width: 67px; flex-shrink: 0"></div>
                <RadiusProperty on:start on:end on:update={onEndRadiusUpdate} value={value.endRadius} absolute={$absolute} bounds={bounds} readonly={readonly} />
                <PropertyAction />
            </PropertyItem>
            <PropertyItem title="Focal">
                <RelativePosition on:start on:end on:update={onStartUpdate} value={value.start} absolute={$absolute} readonly={readonly} bounds={bounds} />
            </PropertyItem>
            <PropertyItem title="Focal Radius">
                <div style="width: 67px; flex-shrink: 0"></div>
                <RadiusProperty on:start on:end on:update={onStartRadiusUpdate} value={value.startRadius} absolute={$absolute} bounds={bounds} readonly={readonly} />
                <PropertyAction />
            </PropertyItem>
        </PropertyGroup>
    {/if}
</Gradient>