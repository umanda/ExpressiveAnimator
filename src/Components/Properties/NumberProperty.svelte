<svelte:options immutable={true} />
<script lang="ts">
    import {createEventDispatcher} from "svelte";
    import SpNumberField from "../../Controls/SpNumberField.svelte";

    const dispatch = createEventDispatcher();

    export let value: number;
    export let property: string = undefined;
    export let type: string = undefined;
    export let label: string = '';

    export let min: number = undefined;
    export let max: number = undefined;
    export let step: number = undefined;
    export let stepModifier: number = 10;
    export let decimals: number = 3;
    export let scale: number = 1;
    export let format: string = undefined;

    export let readonly: boolean = false;
    export let disabled: boolean = false;
    export let quiet: boolean = true;
    export let wrap: boolean = false;
    export let size: string = 's';
</script>
<SpNumberField
        label="{label}"
        value={value}
        format={format}
        readonly={readonly}
        disabled={disabled}
        min={min} max={max} step={step} stepModifier={stepModifier} scale={scale} decimals={decimals}
        size="{size}" quiet={quiet} wrap={wrap}
        on:end
        on:input={e => dispatch('update', {property, type, value: e.detail})}
        on:start={() => dispatch('start', {property, type, value})}
/>