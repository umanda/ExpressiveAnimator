<script lang="ts">
    import BrushSwitch from "./BrushSwitch.svelte";
    import BrushControl from "../Brush";
    import Fill from "./Fill.svelte";
    import Stroke from "./Stroke.svelte";
    import type {Brush, FillRule, StrokeLineCap, StrokeLineJoin} from "@zindex/canvas-engine";
    import {BrushType, EmptyBrush, GradientBrush, SolidBrush} from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    export let showFill: boolean = true;
    export let colorMode: string = undefined;
    export let unit: string = undefined;
    export let dashesPercent: boolean = true;
    export let readonly: boolean = false;

    export let value: {
        // brush
        fill: Brush,
        fillOpacity: number,
        strokeBrush: Brush,
        strokeOpacity: number,

        // fill
        fillRule: FillRule,

        // stroke
        strokeLineWidth: number,
        strokeLineCap: StrokeLineCap,
        strokeLineJoin: StrokeLineJoin,
        strokeMiterLimit: number,
        strokeDashArray: number[],
        strokeDashOffset: number,
    };


    let brushProperty: string;
    $: brushProperty = showFill ? 'fill' : 'strokeBrush';

    function onBrushTypeChange(e: CustomEvent<BrushType>) {
        switch (e.detail) {
            case BrushType.None:
                dispatch('update', {property: brushProperty, value: EmptyBrush.INSTANCE});
                break;
            case BrushType.Solid:
                if (value[brushProperty] instanceof GradientBrush) {
                    dispatch('update', {property: brushProperty, value: (value[brushProperty] as GradientBrush).stopColors.getColorAt(0) || SolidBrush.BLACK});
                } else {
                    dispatch('update', {property: brushProperty, value: SolidBrush.BLACK});
                }
                break;
            // TODO: other brushes
        }
    }

    function onStart() {
        dispatch('start', {property: brushProperty, value: value[brushProperty]});
    }

    function onUpdate(e: CustomEvent<Brush>) {
        dispatch('update', {property: brushProperty, value: e.detail});
    }

    function onAction(e) {
        dispatch('action', {action: e.detail.action, value: {property: brushProperty, data: e.detail.value}});
    }
</script>
<div class="fill-stroke-brush">
    <BrushSwitch on:start on:end on:update on:action value={value} bind:showFill readonly={readonly} />
    <BrushControl on:change={onBrushTypeChange} on:start={onStart} on:end on:update={onUpdate} on:action={onAction}
                  value={showFill ? value.fill : value.strokeBrush} bind:colorMode readonly={readonly} />
</div>
<Stroke on:start on:end on:update on:action value={value} unit={unit} dashesPercent={dashesPercent} readonly={readonly} />
<Fill on:start on:end on:update on:action value={value} readonly={readonly} />
<style>
    .fill-stroke-brush {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: var(--spectrum-global-dimension-size-150);
    }
</style>