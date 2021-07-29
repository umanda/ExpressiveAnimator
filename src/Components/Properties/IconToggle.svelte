<svelte:options immutable={true} />
<script lang="ts">
    import {createEventDispatcher} from "svelte";
    const dispatch = createEventDispatcher();

    export let title: string = undefined;
    export let value: boolean = false;
    export let disabled: boolean = false;
    export let small: boolean = false;
    export let readonly: boolean = false;

    export let checkedIcon: string = 'expr:maintain-checked';
    export let uncheckedIcon: string = 'expr:maintain-unchecked';

    function onClick() {
        value = !value;
        dispatch('change', value);
    }
</script>
<sp-action-button
        class:very-small={small}
        selected={value}
        title="{title}"
        disabled={disabled}
        readonly={readonly}
        on:click={onClick}
        size="s" emphasized quiet>
    <sp-icon slot="icon" name={value ? checkedIcon : uncheckedIcon} size="s"></sp-icon>
</sp-action-button>