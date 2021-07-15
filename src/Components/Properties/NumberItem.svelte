<script lang="ts">

    import PropertyItem from "./PropertyItem.svelte";
    import {createEventDispatcher} from "svelte";
    import SpNumberField from "../../Controls/SpNumberField.svelte";

    const dispatch = createEventDispatcher();

    export let title: string;
    export let value: number;
    export let property: string;
    export let scale: number = 1;

    export let min: number = Number.NEGATIVE_INFINITY;
    export let max: number = Number.POSITIVE_INFINITY;
    export let step: number = 0.01;
    export let round: number = null;

    export let disabled: boolean = false;
    export let readonly: boolean = false;

</script>
<PropertyItem title={title}>
    <SpNumberField
                style="width: var(--small-control-size)" size="s"
                 on:input={e => dispatch('update', {property, value: e.detail})}
                 on:start={() => dispatch('start', {property, value: value})}
                 on:end
                 value={value}
                 min={min}
                 max={max}
                 step={step}
                 scale={scale}
                 disabled={disabled}
                 readonly={readonly}
    />
</PropertyItem>