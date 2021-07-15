<script lang="ts">
    import PropertyGroup from "../PropertyGroup.svelte";
    import PropertyItem from "../PropertyItem.svelte";
    import NumberProperty from "../NumberProperty.svelte";
    import PropertyAction from "../PropertyAction.svelte";
    import {getTitle} from "./utils";

    export let value: {
        width?: number,
        height?: number,
    };
    export let type: string;
    export let isGlobal: boolean = false;
    export let readonly: boolean = false;
    export let unit: string = undefined;
</script>
<PropertyGroup title="{getTitle('Ellipse', isGlobal)}">
    <PropertyItem title="Size" disabled={isGlobal}>
        <NumberProperty
                label="width" value={value.width} property="width" type="{type}"
                min={0}
                format={unit} disabled={value.width == null} readonly={readonly}
                on:end on:update on:start />
        <NumberProperty
                label="height" value={value.height} property="height" type="{type}"
                min={0}
                format={unit} disabled={value.height == null} readonly={readonly}
                on:end on:update on:start />
        <PropertyAction />
    </PropertyItem>
</PropertyGroup>