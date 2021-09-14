<script lang="ts">
    import SpTextFieldWrapper from "../../Controls/SpTextFieldWrapper.svelte";
    import ExportSMIL from "./Export/ExportSMIL.svelte";

    export let isWorking: boolean = false;
    export let action = undefined;
    export let value: {
        selected: string,
        types: { title: string, value: string }[],
        settings: {
            [key: string]: { [key: string]: any }
        },
    };

    const map = {
        'SMIL': ExportSMIL,
    }

    function onTypeChange(e) {
        const type = e.target.value;
        if (type !== value.selected) {
            value.selected = type;
        }
    }
</script>
<div class="wrapper">
    <h2>Export Animation</h2>

    {#if isWorking}
        <sp-progress-bar size="l" label="Exporting..." style="width: 100%" indeterminate></sp-progress-bar>
    {:else}
        <SpTextFieldWrapper label="Export format" labelPosition="above">
            <sp-picker value="{value.selected}" on:change={onTypeChange}>
                {#each value.types as item(item.value)}
                    <sp-menu-item value="{item.value}">{item.title}</sp-menu-item>
                {/each}
            </sp-picker>
        </SpTextFieldWrapper>
    {/if}
    <div class="scroll scroll-no-padding export-settings" hidden-x>
        <svelte:component this={map[value.selected]} disabled={isWorking} settings={value.settings[value.selected]} />
    </div>
</div>
<style>
    .wrapper {
        display: flex;
        flex-direction: column;
        gap: var(--spectrum-global-dimension-size-200);
        height: 300px;
    }

    .wrapper h2 {
        margin: 0;
        text-transform: uppercase;
        text-align: center;
    }

    .export-settings {
        flex: 1;
        --scrollbar-width: 6px;
        display: flex;
        flex-direction: column;
    }
</style>