<script lang="ts">
    import BrushSwitch from "./BrushSwitch.svelte";
    import BrushControl from "../Brush";
    import Fill from "./Fill.svelte";
    import Stroke from "./Stroke.svelte";
    import type {Brush, FillRule, StrokeLineCap, StrokeLineJoin, Rectangle} from "@zindex/canvas-engine";
    import {BrushType, GradientBrush, VectorElement} from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";
    import type {AnimationProject} from "../../../Core";
    import {IsGradientPinned} from "../../../Stores";

    const dispatch = createEventDispatcher();

    export let showFill: boolean = true;
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

        // bounds
        localBounds?: Rectangle,
    };


    let brushProperty: string;
    $: brushProperty = showFill ? 'fill' : 'strokeBrush';

    function changeFillBrushType(project: AnimationProject, element: VectorElement, value: BrushType): boolean {
        return project.middleware.changeFillBrushType(element, value);
    }

    function changeStrokeBrushType(project: AnimationProject, element: VectorElement, value: BrushType): boolean {
        return project.middleware.changeStrokeBrushType(element, value);
    }

    function onBrushTypeChange(e: CustomEvent<BrushType>) {
        dispatch('action', {
            action: showFill ? changeFillBrushType : changeStrokeBrushType,
            type: showFill ? 'changeFillBrushType' : 'changeStrokeBrushType',
            value: e.detail
        });
    }

    function handleGradientUpdate(project: AnimationProject, value: Brush, property: string, filter): boolean {
        if (!(value instanceof GradientBrush)) {
            return project.middleware.setElementsProperty(
                project.selection,
                property as any,
                value,
                filter
            );
        }

        return project.middleware.setGradientBrushRelativeToElement(
            project.selection.activeElement as any,
            value,
            project.selection.vectorElements(),
            property === 'fill',
            !$IsGradientPinned
        );
    }

    function onStart() {
        dispatch('start', {property: brushProperty, value: value[brushProperty]});
    }

    function onUpdate(e: CustomEvent<Brush>) {
        dispatch('update', {property: brushProperty, value: e.detail, update: handleGradientUpdate});
    }

    /*
    <BrushControl on:action={onAction} />
    function onAction(e) {
        dispatch('action', {
            action: e.detail.action,
            type: e.detail.type,
            value: {property: brushProperty, value: e.detail.value},
        });
    }*/
</script>
<div class="fill-stroke-brush">
    <BrushSwitch on:start on:end on:update on:action value={value} bind:showFill readonly={readonly} />
    <BrushControl on:change={onBrushTypeChange} on:start={onStart} on:end on:update={onUpdate}
                  value={showFill ? value.fill : value.strokeBrush} readonly={readonly} bounds={value.localBounds} />
</div>
<Stroke on:start on:end on:update on:action value={value} unit={unit} bind:dashesPercent={dashesPercent} readonly={readonly} />
<Fill on:start on:end on:update on:action value={value} readonly={readonly} />
<style>
    .fill-stroke-brush {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: var(--spectrum-global-dimension-size-150);
    }
</style>