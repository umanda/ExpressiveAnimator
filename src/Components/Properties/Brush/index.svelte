<script lang="ts">
    import {createEventDispatcher} from "svelte";
    import type {Brush, Rectangle} from "@zindex/canvas-engine";
    import {BrushType} from "@zindex/canvas-engine";
    import BrushEmpty from "./BrushEmpty.svelte";
    import BrushSolid from "./BrushSolid.svelte";
    // import BrushPattern from "./BrushPattern.svelte";
    import BrushConicalGradient from "./BrushConicalGradient.svelte";
    import BrushLinearGradient from "./BrushLinearGradient.svelte";
    import BrushRadialGradient from "./BrushRadialGradient.svelte";
    import BrushTwoPointConicalGradient from "./BrushTwoPointConicalGradient.svelte";
    import IconSwitch from "../../../Controls/IconSwitch.svelte";
    import {IsGradientPinned as absolute} from "../../../Stores";

    const dispatch = createEventDispatcher();

    export let value: Brush;
    export let readonly: boolean = false;
    export let bounds: Rectangle = null;

    let component,
        properties;

    $: {
        switch (value.type) {
            case BrushType.Solid:
                component = BrushSolid;
                properties = {value, readonly};
                break;
            case BrushType.LinearGradient:
                component = BrushLinearGradient;
                properties = {value, readonly, bounds, absolute};
                break;
            case BrushType.RadialGradient:
                component = BrushRadialGradient;
                properties = {value, readonly, bounds, absolute};
                break;
            case BrushType.ConicalGradient:
                component = BrushConicalGradient;
                properties = {value, readonly, bounds, absolute};
                break;
            case BrushType.TwoPointGradient:
                component = BrushTwoPointConicalGradient;
                properties = {value, readonly, bounds, absolute};
                break;
                /*
            case BrushType.Pattern:
                component = BrushPattern;
                properties = {value, readonly};
                break;
                */
            default:
                component = BrushEmpty;
                properties = {};
                break;
        }
    }

    const items = [
        {
            value: BrushType.None,
            title: 'None',
            icon: 'expr:fill-none'
        },
        {
            value: BrushType.Solid,
            title: 'Solid',
            icon: 'expr:fill-solid'
        },
        {
            value: BrushType.LinearGradient,
            title: 'Linear gradient',
            icon: 'expr:fill-linear-gradient'
        },
        {
            value: BrushType.RadialGradient,
            title: 'Radial gradient',
            icon: 'expr:fill-radial-gradient',
        },
        {
            value: BrushType.TwoPointGradient,
            title: 'Radial gradient with focal point',
            icon: 'expr:fill-radial-focal-gradient',
        },
        {
            value: BrushType.ConicalGradient,
            title: 'Sweep gradient',
            icon: 'expr:fill-conical-gradient',
        },
        /*
        {
            value: BrushType.Pattern,
            title: 'Pattern',
            icon: 'expr:fill-pattern',
            disabled: true
        },
         */
    ];
</script>

<div class="brush-control">
    <IconSwitch on:change={e => dispatch('change', e.detail)} value={value.type} items={items} readonly={readonly} />
</div>
<div class="brush-control-value">
    <svelte:component this={component} {...properties} on:start on:end on:update />
</div>
<style>
    .brush-control {
        display: flex;
        flex-direction: row;
        justify-content: center;
    }
</style>