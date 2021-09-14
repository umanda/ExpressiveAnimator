<script lang="ts">
    import SpNumberField from "../../../Controls/SpNumberField.svelte";
    import {CurrentProject} from "../../../Stores";

    export let disabled: boolean = false;
    export let settings: {
        size: { width: number, height: number },
        fixedSize: boolean,
        freeze: boolean,
        repeat: number,
        repeatTime: number,
    }

    function onSize(e) {
        settings.fixedSize = e.target.checked;
        if (settings.fixedSize) {
            const board = $CurrentProject.document.board;
            settings.size = {
                width: board.width,
                height: board.height,
            };
        }
    }
</script>
<sp-field-group horizontal>
    <sp-switch checked={settings.repeat === 0} on:change={e => settings.repeat = e.target.checked ? 0 : 1} emphasized
               disabled={disabled}>Loop indefinitely
    </sp-switch>
    <sp-switch checked={settings.fixedSize} on:change={onSize} emphasized disabled={disabled}>Fixed size</sp-switch>
    <sp-switch checked={settings.freeze} on:change={e => settings.freeze = e.target.checked} emphasized
               disabled={disabled}>Freeze
    </sp-switch>
</sp-field-group>
<div class="input-wrapper">
    {#if settings.repeat > 0}
        <SpNumberField label="Repetitions" labelPosition="above" bind:value={settings.repeat} disabled={disabled}
                       min={1} max={100000} step={1}/>
    {:else}
        <SpNumberField label="Max duration" labelPosition="above" format="ms" bind:value={settings.repeatTime}
                       disabled={disabled} min={0} step={1}/>
        <sp-field-label style="align-self: flex-end">(use 0 to disable max duration)</sp-field-label>
    {/if}
</div>
{#if settings.fixedSize}
    <div class="input-wrapper">
        <SpNumberField label="Width" labelPosition="above" bind:value={settings.size.width} disabled={disabled}
                       min={1} step={1}/>
        <SpNumberField label="Height" labelPosition="above" bind:value={settings.size.height} disabled={disabled}
                       min={1} step={1}/>
    </div>
{/if}
<style>
    .input-wrapper {
        display: flex;
        align-items: center;
        gap: var(--spectrum-global-dimension-size-100);
    }
</style>