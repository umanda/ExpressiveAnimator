<script lang="ts">
    import type {LinearGradientBrush, Point, Rectangle} from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";
    import Gradient from "./Gradient.svelte";
    import PropertyGroup from "../PropertyGroup.svelte";
    import PropertyItem from "../PropertyItem.svelte";
    import RelativePosition from "../RelativePosition.svelte";
    import type {Writable} from "svelte/store";

    const dispatch = createEventDispatcher();

    export let value: LinearGradientBrush;
    export let absolute: Writable<boolean>;
    export let readonly: boolean = false;
    export let bounds: Rectangle = undefined;

    function onStart() {
        dispatch('start');
    }

    function onPointUpdate(point: Point, property: 'start' | 'end') {
        let start: Point = null,
            end: Point = null;
        if (property === 'start') {
            start = point;
        } else {
            end = point;
        }
        dispatch('update', value.withPosition(start, end));
    }

    let open: boolean;
</script>
<Gradient bind:open value={value} readonly={readonly} on:start on:update on:end bind:isPinned={$absolute} disablePin={bounds == null}>
    {#if open}
        <PropertyGroup title="Linear gradient">
            <PropertyItem title="From">
                <RelativePosition on:start={onStart} on:end on:update={e => onPointUpdate(e.detail, 'start')} value={value.start} absolute={$absolute} readonly={readonly} bounds={bounds} />
            </PropertyItem>
            <PropertyItem title="To">
                <RelativePosition on:start={onStart} on:end on:update={e => onPointUpdate(e.detail, 'end')} value={value.end} absolute={$absolute} readonly={readonly} bounds={bounds} />
            </PropertyItem>
        </PropertyGroup>
    {/if}
</Gradient>