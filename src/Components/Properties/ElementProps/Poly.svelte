<script lang="ts">
    import PropertyGroup from "../PropertyGroup.svelte";
    import PropertyItem from "../PropertyItem.svelte";
    import {createEventDispatcher} from "svelte";
    import {getTitle} from "./utils";
    import SwitchItem from "../SwitchItem.svelte";
    import TextProperty from "../TextProperty.svelte";
    import type {Point} from "@zindex/canvas-engine";

    const dispatch = createEventDispatcher();

    export let value: {
        points: Point[],
        isClosed: boolean,
    };
    export let type: string;
    export let isGlobal: boolean = false;
    export let readonly: boolean = false;
    export let unit: string = undefined;
</script>
<PropertyGroup title="{getTitle('Poly', isGlobal)}">
    <PropertyItem title="Points">
        <TextProperty left>{value?.points?.length || 0}</TextProperty>
    </PropertyItem>
    <PropertyItem title="Closed" disabled={isGlobal}>
        <SwitchItem on:update value={value.isClosed} property="isClosed" type={type} disabled={isGlobal} readonly={readonly} />
    </PropertyItem>
</PropertyGroup>