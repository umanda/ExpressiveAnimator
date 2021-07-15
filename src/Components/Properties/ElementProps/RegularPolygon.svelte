<script lang="ts">
    import PropertyGroup from "../PropertyGroup.svelte";
    import SpSlider from "../../../Controls/SpSlider.svelte";
    import PropertyItem from "../PropertyItem.svelte";
    import NumberProperty from "../NumberProperty.svelte";
    import PropertyAction from "../PropertyAction.svelte";
    import {createEventDispatcher} from "svelte";
    import {getTitle} from "./utils";

    const dispatch = createEventDispatcher();

    export let value: {
        sides: number,
        radius: number,
        cornerRadius: number,
        angle: number,
    };
    export let type: string;
    export let isGlobal: boolean = false;
    export let readonly: boolean = false;
    export let unit: string = undefined;
</script>
<PropertyGroup title="{getTitle('Regular polygon', isGlobal)}">
    <PropertyItem title="Size">
        <NumberProperty
                label="radius" value={value.radius} property="radius" type="{type}"
                min={0}
                format={unit} disabled={isGlobal} readonly={readonly}
                on:end on:update on:start />
        <NumberProperty
                label="roundness" value={value.cornerRadius} property="cornerRadius" type="{type}"
                format="percent" readonly={readonly}
                on:end on:update on:start />
        <PropertyAction />
    </PropertyItem>
    <SpSlider
            on:end
            on:input={e => dispatch('update', {property: 'sides', type, value: e.detail})}
            on:start={() => dispatch('start', {property: 'sides', type, value: value.sides})}
            disabled={value.sides == null}
            readonly={readonly}
            label="Sides" value={value.sides} min={3} max={25} step={1} decimals={0} editable allowOverflow />
    <SpSlider
            on:end
            on:input={e => dispatch('update', {property: 'angle', type, value: e.detail})}
            on:start={() => dispatch('start', {property: 'angle', type, value: value.angle})}
            disabled={isGlobal}
            readonly={readonly}
            label="Start angle" value={value.angle || 0}
            min={-360} allowUnderflow={true}
            max={360} allowOverflow={true}
            step={1} decimals={0} editable format="deg" />
</PropertyGroup>