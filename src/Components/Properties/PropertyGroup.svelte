<svelte:options immutable={true} />
<script lang="ts">
    export let title: string = '';
</script>
<div class="property-group">
    {#if title !== ''}
        <div class="property-title">{title}</div>
    {/if}
    <div class="properties"><slot /></div>
</div>
<style>
    .property-group {
        --small-control-size: var(--spectrum-global-dimension-size-800);
    }
    .property-group:first-child .property-title {
        margin-top: 0;
    }

    .property-title {
        margin-top: var(--spectrum-global-dimension-size-300);
        margin-bottom: var(--spectrum-global-dimension-size-150);
        text-transform: uppercase;
        letter-spacing: 2px;
        /*font-weight: lighter;*/
        font-size: var(--spectrum-global-dimension-font-size-50);
    }
    .properties {
        display: flex;
        flex-direction: column;
        gap: var(--property-group-gap, var(--spectrum-global-dimension-size-100));
    }
</style>