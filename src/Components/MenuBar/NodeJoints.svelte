<svelte:options immutable={true} />
<script lang="ts">
    import {PathJoint} from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";
    const dispatch = createEventDispatcher();

    export let disabled: boolean = false;
    export let showExtra: boolean = false;
</script>
<sp-action-group compact quiet>
    {#if showExtra}
        <sp-action-button title="Join nodes" on:click={e => dispatch('extra', {type: 'join', alt: e.altKey})} disabled={disabled}>
            <sp-icon size="s" name="expr:join-nodes" slot="icon"></sp-icon>
        </sp-action-button>
        <sp-action-button title="Break nodes" on:click={e => dispatch('extra', {type: 'break', alt: e.altKey})} disabled={disabled}>
            <sp-icon size="s" name="expr:break-points" slot="icon"></sp-icon>
        </sp-action-button>
        <sp-divider size="s" vertical style="height: 32px; margin: 0 auto" disabled={disabled}></sp-divider>
    {/if}
    <sp-action-button title="Straight" on:click={() => dispatch('input', PathJoint.Corner)} disabled={disabled}>
        <sp-icon size="s" name="expr:anchor-straight" slot="icon"></sp-icon>
    </sp-action-button>
    <sp-action-button title="Disconnected" on:click={() => dispatch('input', PathJoint.Cusp)} disabled={disabled}>
        <sp-icon size="s" name="expr:anchor-disconnected" slot="icon"></sp-icon>
    </sp-action-button>
    <sp-action-button title="Mirrored" on:click={() => dispatch('input', PathJoint.Symmetric)} disabled={disabled}>
        <sp-icon size="s" name="expr:anchor-mirrored" slot="icon"></sp-icon>
    </sp-action-button>
    <sp-action-button title="Asymmetric" on:click={() => dispatch('input', PathJoint.Asymmetric)} disabled={disabled}>
        <sp-icon size="s" name="expr:anchor-asymmetric" slot="icon"></sp-icon>
    </sp-action-button>
    <sp-divider size="s" vertical style="height: 32px; margin: 0 auto" disabled={disabled}></sp-divider>
</sp-action-group>
