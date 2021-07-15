<script lang="ts">
    import {createEventDispatcher} from "svelte";
    const dispatch = createEventDispatcher();

    export let value: boolean;
    export let property: string;
    export let type: string = undefined;

    export let disabled: boolean = false;
    export let readonly: boolean = false;
</script>
<sp-switch checked={value} readonly={readonly} disabled={disabled}
           on:change={e => dispatch('update', {property, type, value: e.target.checked})}
           emphasized
           style="width: var(--spectrum-switch-track-width); --spectrum-switch-m-height: var(--spectrum-alias-item-height-s)"></sp-switch>