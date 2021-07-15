<script lang="ts">
    import PropertyGroup from "./PropertyGroup.svelte";
    import SpSlider from "../../Controls/SpSlider.svelte";
    import PropertyItem from "./PropertyItem.svelte";
    import SwitchItem from "./SwitchItem.svelte";
    import {BlendMode, PaintOrder} from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    export let element: {
        isolate: boolean,
        blend: BlendMode,
        opacity: number,
        paintOrder?: PaintOrder,
    };
    export let readonly: boolean = false;
</script>
<PropertyGroup title="Compositing">
    <SpSlider
            on:end
            on:start={() => dispatch('start', {property: 'opacity', value: element.opacity})}
            on:input={e => dispatch('update', {property: 'opacity', value: e.detail})}
            label="Opacity"
            value={element.opacity}
            min={0} max={1} step={0.01}
            readonly={readonly}
            format="percent" variant="filled" editable />
    {#if element.paintOrder != null}
        <PropertyItem title="Order">
            <sp-picker readonly={readonly} on:change={e => dispatch('update', {property: 'paintOrder', value: parseInt(e.target.value)})}
                       value={element.paintOrder.toString()} style="width: 100%" size="s">
                <sp-menu-item value={PaintOrder.FillStrokeMarkers.toString()}>Fill, Stroke</sp-menu-item>
                <sp-menu-item value={PaintOrder.StrokeFillMarkers.toString()}>Stroke, Fill</sp-menu-item>
            </sp-picker>
        </PropertyItem>
    {/if}
    <PropertyItem title="Blend">
        <sp-picker readonly={readonly} on:change={e => dispatch('update', {property: 'blend', value: parseInt(e.target.value)})}
                   value={element.blend.toString()} style="width: 100%" size="s">
            <sp-menu-item value={BlendMode.Normal.toString()}>Normal</sp-menu-item>
            <sp-menu-divider></sp-menu-divider>
            <sp-menu-item value={BlendMode.Color.toString()}>Color</sp-menu-item>
            <sp-menu-item value={BlendMode.ColorBurn.toString()}>Color burn</sp-menu-item>
            <sp-menu-item value={BlendMode.ColorDodge.toString()}>Color dodge</sp-menu-item>
            <sp-menu-divider></sp-menu-divider>
            <sp-menu-item value={BlendMode.Darken.toString()}>Darken</sp-menu-item>
            <sp-menu-item value={BlendMode.Lighten.toString()}>Lighten</sp-menu-item>
            <sp-menu-divider></sp-menu-divider>
            <sp-menu-item value={BlendMode.Difference.toString()}>Difference</sp-menu-item>
            <sp-menu-item value={BlendMode.Exclusion.toString()}>Exclusion</sp-menu-item>
            <sp-menu-item value={BlendMode.Multiply.toString()}>Multiply</sp-menu-item>
            <sp-menu-divider></sp-menu-divider>
            <sp-menu-item value={BlendMode.SoftLight.toString()}>SoftLight</sp-menu-item>
            <sp-menu-item value={BlendMode.HardLight.toString()}>HardLight</sp-menu-item>
            <sp-menu-divider></sp-menu-divider>
            <sp-menu-item value={BlendMode.Hue.toString()}>Hue</sp-menu-item>
            <sp-menu-item value={BlendMode.Saturation.toString()}>Saturation</sp-menu-item>
            <sp-menu-item value={BlendMode.Luminosity.toString()}>Luminosity</sp-menu-item>
            <sp-menu-divider></sp-menu-divider>
            <sp-menu-item value={BlendMode.Overlay.toString()}>Overlay</sp-menu-item>
            <sp-menu-item value={BlendMode.Screen.toString()}>Screen</sp-menu-item>
        </sp-picker>
    </PropertyItem>
    <PropertyItem title="Isolate">
        <SwitchItem on:update value={element.isolate} property="isolate" readonly={readonly} />
    </PropertyItem>
</PropertyGroup>