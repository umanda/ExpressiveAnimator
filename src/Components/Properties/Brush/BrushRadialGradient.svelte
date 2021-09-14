<script lang="ts">
    import type {Point, Rectangle, RadialGradientBrush} from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";
    import Gradient from "./Gradient.svelte";
    import RadiusProperty from "./RadiusProperty.svelte";
    import PropertyGroup from "../PropertyGroup.svelte";
    import PropertyItem from "../PropertyItem.svelte";
    import RelativePosition from "../RelativePosition.svelte";
    import PropertyAction from "../PropertyAction.svelte";
    import type {Writable} from "svelte/store";

    const dispatch = createEventDispatcher();

    export let value: RadialGradientBrush;
    export let absolute: Writable<boolean>;
    export let readonly: boolean = false;
    export let bounds: Rectangle = undefined;

    function onCenterUpdate(e: CustomEvent<Point>) {
        dispatch('update', value.withCenter(e.detail));
    }

    function onRadiusUpdate(e: CustomEvent<number>) {
        dispatch('update', value.withRadius(e.detail));
    }

    let open: boolean;
</script>
<Gradient bind:open value={value} readonly={readonly} on:start on:update on:end bind:isPinned={$absolute} disablePin={bounds == null}>
    {#if open}
        <PropertyGroup title="Radial gradient">
            <PropertyItem title="Center">
                <RelativePosition on:start on:end on:update={onCenterUpdate} value={value.center} absolute={$absolute} readonly={readonly} bounds={bounds} />
            </PropertyItem>
            <PropertyItem title="Radius">
                <div style="width: 67px; flex-shrink: 0"></div>
                <RadiusProperty on:start on:end on:update={onRadiusUpdate} value={value.radius} absolute={$absolute} bounds={bounds} readonly={readonly} />
                <PropertyAction />
            </PropertyItem>
        </PropertyGroup>
    {/if}
</Gradient>