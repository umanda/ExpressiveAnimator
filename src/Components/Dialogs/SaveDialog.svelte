<script lang="ts">
    export let isWorking: boolean = false;
    export let action = undefined;
</script>
{#if isWorking}
    <sp-progress-bar size="l" label="Saving project..." style="width: 100%" indeterminate></sp-progress-bar>
{:else}
    <sp-field-label size="l">Project contains unsaved changes</sp-field-label>
{/if}