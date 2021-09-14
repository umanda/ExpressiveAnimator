<script lang="ts">
    import {CurrentTool, CurrentProject} from "../../Stores";
    import SubTools from "./SubTools.svelte";
    import {buttons, getTitle} from "./buttons";

    export let disabled: boolean = false;
    export let readonly: boolean = false;

    function selectTool(e: MouseEvent) {
        if (readonly) {
            return;
        }
        const name = (e.target as HTMLElement).getAttribute('data-tool-name');
        if ($CurrentTool.name !== name) {
            CurrentTool.change(name);
            $CurrentProject.engine?.focus();
        }
    }
</script>
<sp-action-group vertical quiet emphasized>
    {#each buttons as button}
        {#if Array.isArray(button)}
            <SubTools buttons={button} disabled={disabled || button.disabled} readonly={readonly} />
        {:else}
            <sp-action-button on:click={selectTool} title={getTitle(button)} selected={!disabled && button.tool === $CurrentTool.name} readonly={readonly} disabled={disabled || button.disabled} data-tool-name="{button.tool}">
                <sp-icon size="s" name={button.icon} slot="icon"></sp-icon>
            </sp-action-button>
        {/if}
    {/each}
</sp-action-group>