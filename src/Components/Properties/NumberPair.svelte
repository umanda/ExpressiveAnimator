<script lang="ts">
    import type {PointStruct} from "@zindex/canvas-engine";
    import SpNumberField from "../../Controls/SpNumberField.svelte";
    import IconToggle from "./IconToggle.svelte";
    import PropertyAction from "./PropertyAction.svelte";
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    export let value: PointStruct;
    export let properties: { x: object, y: object };
    export let quiet: boolean = true;

    export let showProportionsIcon: boolean = false;
    export let proportions: boolean = false;
    export let readonly: boolean = false;
    export let disabled: boolean = false;

    function getData(item: 'x' | 'y', input: number): PointStruct {
        if (input === value[item]) {
            return value;
        }

        let data = {x: value.x, y: value.y};

        data[item] = input;

        if (proportions) {
            const a = item === 'x' ? 'y' : 'x';
            data[a] *= input / value[item];
            data[a] = Math.round(data[a] * 10000) / 10000;
        }

        return data;
    }

    function onInput(item: 'x' | 'y', input: number) {
        dispatch('input', getData(item, input));
    }
</script>
<SpNumberField
        {...properties.x}
        disabled={disabled}
        readonly={readonly}
        size="s"
        quiet={quiet}
        value={value?.x}
        on:input={e => onInput('x', e.detail)}
        on:end={() => dispatch('end', 'x')}
        on:start={() => dispatch('start', 'x')}
/>
<SpNumberField
        {...properties.y}
        disabled={disabled}
        readonly={readonly}
        size="s"
        quiet={quiet}
        value={value?.y}
        on:input={e => onInput('y', e.detail)}
        on:end={() => dispatch('end', 'y')}
        on:start={() => dispatch('start', 'y')}
/>
<PropertyAction>
    {#if showProportionsIcon}
        <IconToggle title="Keep proportions" bind:value={proportions} disabled={readonly} />
    {:else}
        <slot />
    {/if}
</PropertyAction>
