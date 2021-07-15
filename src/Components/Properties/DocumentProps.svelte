<script lang="ts">
    import {createEventDispatcher} from "svelte";
    import PropertyGroup from "./PropertyGroup.svelte";
    import NumberPair from "./NumberPair.svelte";
    import type {AnimationDocument} from "../../Core";
    import PropertyItem from "./PropertyItem.svelte";
    import SpTextField from "../../Controls/SpTextField.svelte";
    import type {Size} from "@zindex/canvas-engine";
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

    let properties = {
        size: {
            x: {label: 'width', format: 'decimal', decimals: 0, step: 1, min: 0},
            y: {label: 'height', format: 'decimal', decimals: 0, step: 1, min: 0},
        }
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
                    proportions={proportionalSize}
                    showProportionsIcon
                    value={{x: value.board.width, y: value.board.height}} />
    </PropertyItem>
</PropertyGroup>
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