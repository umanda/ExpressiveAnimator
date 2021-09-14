<script lang="ts">
    import {CurrentTheme} from "../Stores";
    export let disabled: boolean = false;
</script>
<sp-action-group vertical quiet emphasized>
    {#if $CurrentTheme === 'dark'}
        <sp-action-button on:click={() => CurrentTheme.set('light')} title="Light theme" disabled={disabled}>
            <sp-icon size="s" name="workflow:Light" slot="icon"></sp-icon>
        </sp-action-button>
    {:else}
        <sp-action-button on:click={() => CurrentTheme.set('dark')} title="Dark theme" disabled={disabled}>
            <sp-icon size="s" name="workflow:Moon" slot="icon"></sp-icon>
        </sp-action-button>
    {/if}
</sp-action-group>