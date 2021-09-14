<script lang="ts">
    import {createEventDispatcher} from "svelte";
    import PropertyGroup from "./PropertyGroup.svelte";
    import NumberPair from "./NumberPair.svelte";
    import type {AnimationDocument} from "../../Core";
    import PropertyItem from "./PropertyItem.svelte";
    import SpTextField from "../../Controls/SpTextField.svelte";
    import type {Size, Grid2D, PointStruct} from "@zindex/canvas-engine";
    import {Rectangle} from "@zindex/canvas-engine";
    import SpNumberField from "../../Controls/SpNumberField.svelte";

    const dispatch = createEventDispatcher();

    export let value: AnimationDocument;
    export let unit: string = undefined;
    export let proportionalSize: boolean = true;
    export let readonly: boolean = false;

    let size: Size = null;

    function onSizeDone() {
        if (!size) {
            return;
        }
        dispatch('update', {property: 'board', value: Rectangle.fromSize(size)});
        size = null;
    }

    let grid: Grid2D;
    $: grid = value?.grid as Grid2D;

    let gridSize: PointStruct = null;

    function onGridSizeDone() {
        if (!gridSize || (gridSize.x === grid.horizontalSubdivisions && gridSize.y === grid.verticalSubdivisions)) {
            return;
        }
        grid.horizontalSubdivisions = gridSize.x;
        grid.verticalSubdivisions = gridSize.y;
        gridSize = null;

        dispatch('action', () => true);
    }

    let properties = {
        size: {
            x: {label: 'width', format: 'decimal', decimals: 0, step: 1, min: 0},
            y: {label: 'height', format: 'decimal', decimals: 0, step: 1, min: 0},
        },
        grid: {
            x: {label: 'x', format: 'decimal', decimals: 0, step: 1, min: 1, max: 30},
            y: {label: 'y', format: 'decimal', decimals: 0, step: 1, min: 1, max: 30},
        },
    };

    $: properties.size.x.format = properties.size.y.format = unit;
</script>
<PropertyGroup title="Document">
    <PropertyItem title="Title">
        <SpTextField
                     on:change={e => dispatch('update', {property: 'title', value: e.detail})}
                     readonly={readonly}
                     style="--textfield-width: 100%; flex: 1"
                     size="s"
                     quiet={true}
                     value={value.title || ''} />
    </PropertyItem>
<!--    <PropertyItem title="Unit">-->
<!--        <sp-picker readonly={readonly} on:change={e => dispatch('update', {property: 'unit', value: e.target.value})}-->
<!--                   value={value.unit || 'px'} style="width: 100%" size="s">-->
<!--            <sp-menu-item value="px">Pixel</sp-menu-item>-->
<!--            <sp-menu-item value="in">Inch</sp-menu-item>-->
<!--            <sp-menu-item value="mm">Millimeter</sp-menu-item>-->
<!--            <sp-menu-item value="cm">Centimeter</sp-menu-item>-->
<!--        </sp-picker>-->
<!--    </PropertyItem>-->
    <PropertyItem title="Size">
        <NumberPair on:end={onSizeDone}
                    on:start={() => size = value.board}
                    on:input={e => size = {width: e.detail.x, height: e.detail.y}}
                    readonly={readonly}
                    properties={properties.size}
                    bind:proportions={proportionalSize}
                    showProportionsIcon
                    value={{x: value.board.width, y: value.board.height}} />
    </PropertyItem>
</PropertyGroup>
{#if grid}
    <PropertyGroup title="Grid">
        <PropertyItem title="Division">
            <NumberPair on:end={onGridSizeDone}
                        on:start={() => gridSize = {x: grid.horizontalSubdivisions, y: grid.verticalSubdivisions}}
                        on:input={e => gridSize = e.detail}
                        readonly={readonly}
                        properties={properties.grid}
                        value={{x: grid.horizontalSubdivisions, y: grid.verticalSubdivisions}} />
        </PropertyItem>
    </PropertyGroup>
{/if}
{#if value.animation}
    <PropertyGroup title="Animation">
        <PropertyItem title="Duration">
            <SpNumberField
                    on:change={e => dispatch('update', {property: 'duration', type: 'animation', value: e.detail})}
                    min={0} max={1000000} decimals={0} step={1} stepModifier={100}
                    readonly={readonly}
                    style="--textfield-width: 100%; flex: 1"
                    size="s"
                    quiet={true}
                    format="ms"
                    value={value.animation.duration}
            />
        </PropertyItem>
    </PropertyGroup>
{/if}