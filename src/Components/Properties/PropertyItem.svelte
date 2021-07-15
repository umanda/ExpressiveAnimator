<script lang="ts">
    export let title: string;
    export let padded: boolean = false;
    export let disabled: boolean = false;
</script>
<div class="property-item" class:padded={padded}>
    {#if title != null}
        <sp-field-label disabled={disabled}>{title}</sp-field-label>
    {/if}
    <div class="property-item-controls">
        <slot />
    </div>
</div>
<style>
    .property-item {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
    }

    .property-item.padded {
        margin-bottom: var(--spectrum-global-dimension-size-300);
    }

    .property-item > sp-field-label {
        min-width: var(--spectrum-global-dimension-size-750);
    }

    .property-item > .property-item-controls {
        flex: 1;
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: var(--property-group-gap, var(--spectrum-global-dimension-size-100));
    }
</style>