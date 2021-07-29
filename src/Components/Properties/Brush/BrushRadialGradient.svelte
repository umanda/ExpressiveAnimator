<script lang="ts">
    import type {RadialGradientBrush} from "@zindex/canvas-engine";
    import {Point, Rectangle} from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";
    import Gradient from "./Gradient.svelte";
    import PropertyGroup from "../PropertyGroup.svelte";
    import PropertyItem from "../PropertyItem.svelte";
    import RelativePosition from "../RelativePosition.svelte";
    import NumberProperty from "../NumberProperty.svelte";
    import PropertyAction from "../PropertyAction.svelte";

    const dispatch = createEventDispatcher();

    export let value: RadialGradientBrush;
    export let readonly: boolean = false;
    export let bounds: Rectangle = undefined;

    function onStart() {
        dispatch('start');
    }

    function onCenterUpdate(e: CustomEvent<Point>) {
        dispatch('update', value.withCenter(e.detail));
    }

    function onRadiusUpdate(e: CustomEvent<{ value: number }>) {
        dispatch('update', value.withRadius(e.detail.value));
    }
</script>
<Gradient value={value} readonly={readonly} on:start on:update on:end>
    <PropertyGroup title="Radial gradient">
        <PropertyItem title="Center">
            <RelativePosition on:start={onStart} on:end on:update={onCenterUpdate} value={value.center} readonly={readonly} bounds={bounds} />
        </PropertyItem>
        <PropertyItem title="Radius">
            <div style="width: 67px; flex-shrink: 0"></div>
            <NumberProperty label="" property={null} min={0} on:start={onStart} on:end on:update={onRadiusUpdate} value={value.radius} readonly={readonly} />
            <PropertyAction />
        </PropertyItem>
    </PropertyGroup>
</Gradient>