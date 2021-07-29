<svelte:options immutable={true} />
<script lang="ts">
    import {createEventDispatcher} from "svelte";

    export let items: {
        value: any,
        title: string,
        icon: string,
        disabled?: boolean
    }[];
    export let value;
    export let size: string = 'm';
    export let disabled: boolean = false;
    export let readonly: boolean = false;
    export let small: boolean = false;

    const dispatch = createEventDispatcher();

    function onClick(val) {
        if (readonly || value === val) {
            return;
        }
        value = val;
        dispatch('change', value);
    }
</script>
<sp-action-group compact emphasized size="{size}" disabled={disabled} class:very-small={small}>
    {#each items as item (item.value)}
        <sp-action-button on:click={() => onClick(item.value)} selected={item.value === value} title="{item.title}" size="{size}" disabled={item.disabled === true}>
            <sp-icon name="{item.icon}" size="{size}" slot="icon"></sp-icon>
        </sp-action-button>
    {/each}
</sp-action-group>