<script lang="ts">
    import type {ConicalGradientBrush, Point, Rectangle} from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";
    import Gradient from "./Gradient.svelte";
    import PropertyGroup from "../PropertyGroup.svelte";
    import PropertyItem from "../PropertyItem.svelte";
    import RelativePosition from "../RelativePosition.svelte";
    import NumberProperty from "../NumberProperty.svelte";
    import PropertyAction from "../PropertyAction.svelte";
    import type {Writable} from "svelte/store";

    const dispatch = createEventDispatcher();

    export let value: ConicalGradientBrush;
    export let absolute: Writable<boolean>;
    export let readonly: boolean = false;
    export let bounds: Rectangle = undefined;

    function onStart() {
        dispatch('start');
    }

    function onCenterUpdate(e: CustomEvent<Point>) {
        dispatch('update', value.withCircle(e.detail));
    }

    function onStartAngle(e: CustomEvent<{value: number}>) {
        dispatch('update', value.withCircle(null, e.detail.value, null));
    }

    function onEndAngle(e: CustomEvent<{value: number}>) {
        dispatch('update', value.withCircle(null, null, e.detail.value));
    }

    let open: boolean;
</script>
<Gradient bind:open value={value} readonly={readonly} on:start on:update on:end bind:isPinned={$absolute} disablePin={bounds == null}>
    {#if open}
        <PropertyGroup title="Radial gradient">
            <PropertyItem title="Center">
                <RelativePosition on:start={onStart} on:end on:update={onCenterUpdate} value={value.center} absolute={$absolute} readonly={readonly} bounds={bounds} />
            </PropertyItem>
            <PropertyItem title="Arc">
                <NumberProperty label="start"
                                min={0} max={value.endAngle} step={1} decimals={0}
                                on:start={onStart} on:end on:update={onStartAngle}
                                value={value.startAngle} readonly={readonly} format="deg" />
                <NumberProperty label="end"
                                min={value.startAngle} max={360} step={1} decimals={0}
                                on:start={onStart} on:end on:update={onEndAngle}
                                value={value.endAngle} readonly={readonly} format="deg" />
                <PropertyAction />
            </PropertyItem>
        </PropertyGroup>
    {/if}
</Gradient>