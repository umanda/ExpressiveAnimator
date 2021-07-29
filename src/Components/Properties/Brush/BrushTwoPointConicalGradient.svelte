<script lang="ts">
    import type {TwoPointGradientBrush} from "@zindex/canvas-engine";
    import {Point, Rectangle} from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";
    import Gradient from "./Gradient.svelte";
    import PropertyGroup from "../PropertyGroup.svelte";
    import PropertyItem from "../PropertyItem.svelte";
    import RelativePosition from "../RelativePosition.svelte";
    import NumberProperty from "../NumberProperty.svelte";
    import PropertyAction from "../PropertyAction.svelte";

    const dispatch = createEventDispatcher();

    export let value: TwoPointGradientBrush;
    export let readonly: boolean = false;
    export let bounds: Rectangle = undefined;

    function onStart() {
        dispatch('start');
    }

    function onStartUpdate(e: CustomEvent<Point>) {
        dispatch('update', value.withStart(e.detail));
    }

    function onStartRadiusUpdate(e: CustomEvent<{ value: number }>) {
        dispatch('update', value.withStart(null, e.detail.value));
    }

    function onEndUpdate(e: CustomEvent<Point>) {
        dispatch('update', value.withEnd(e.detail));
    }

    function onEndRadiusUpdate(e: CustomEvent<{ value: number }>) {
        dispatch('update', value.withEnd(null, e.detail.value));
    }

</script>
<Gradient value={value} readonly={readonly} on:start on:update on:end>
    <PropertyGroup title="Radial gradient with focal point">
        <PropertyItem title="Center">
            <RelativePosition on:start={onStart} on:end on:update={onStartUpdate} value={value.start} readonly={readonly} bounds={bounds} />
        </PropertyItem>
        <PropertyItem title="Radius">
            <div style="width: 67px; flex-shrink: 0"></div>
            <NumberProperty label="" min={0} on:start={onStart} on:end on:update={onStartRadiusUpdate} value={value.startRadius} readonly={readonly} />
            <PropertyAction />
        </PropertyItem>
        <PropertyItem title="Focal">
            <RelativePosition on:start={onStart} on:end on:update={onEndUpdate} value={value.end} readonly={readonly} bounds={bounds} />
        </PropertyItem>
        <PropertyItem title="Focal Radius">
            <div style="width: 67px; flex-shrink: 0"></div>
            <NumberProperty label="" min={0} on:start={onStart} on:end on:update={onEndRadiusUpdate} value={value.endRadius} readonly={readonly} />
            <PropertyAction />
        </PropertyItem>
    </PropertyGroup>
</Gradient>