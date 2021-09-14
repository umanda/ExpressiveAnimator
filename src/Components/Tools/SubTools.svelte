<script lang="ts">
    import {CurrentProject, CurrentTool} from "../../Stores";
    import {getTitle} from "./buttons";
    import type {ToolButtonDef} from "./buttons";

    export let disabled: boolean = false;
    export let readonly: boolean = false;
    export let buttons = [];

    export let placement: string = 'right';

    let current, last = null;
    $: {
        current = getCurrentTool(buttons, $CurrentTool.name) || buttons[0];
        last = current;
    }

    let open = false;

    function selectTool(e: MouseEvent) {
        const el = e.target as HTMLElement;
        el.dispatchEvent(new Event('close', {bubbles: true, composed: true}));
        if (readonly) {
            return;
        }
        const name = el.getAttribute('data-tool-name');
        if ($CurrentTool.name !== name) {
            CurrentTool.change(name);
            $CurrentProject.engine?.focus();
        }
    }

    function getCurrentTool(buttons: any[], name: string) {
        return buttons.find((v: ToolButtonDef) => v.tool === name) || last;
    }
</script>
<overlay-trigger type="modal" placement="{placement}" disabled={disabled}
                 on:sp-opened={() => open = true}
                 on:sp-closed={() => open = false}
                 offset={-6}
>
    <sp-action-button on:click={e => !open && selectTool(e)} title={getTitle(current)}
                      data-tool-name="{current.tool}" selected={!disabled && $CurrentTool.name === current.tool}
                      readonly={readonly} disabled={disabled} hold-affordance slot="trigger">
        <sp-icon size="s" name="{current.icon}" slot="icon"></sp-icon>
    </sp-action-button>
    <sp-popover slot="longpress-content" tip style="--spectrum-popover-dialog-min-width: 0;">
        <sp-menu style="width: var(--spectrum-global-dimension-size-2000)">
            {#each buttons as button (button.tool)}
                {#if current !== button}
                    <sp-menu-item disabled={readonly || button.disabled} on:click={selectTool} data-tool-name="{button.tool}">
                        <sp-icon size="s" name={button.icon} slot="icon"></sp-icon>
                        {button.title}
                        {#if button.shortcut}
                            <span class="shortcut-letter" slot="value">{button.shortcut}</span>
                        {/if}
                    </sp-menu-item>
                {/if}
            {/each}
        </sp-menu>
    </sp-popover>
</overlay-trigger>
<style>
    overlay-trigger, sp-action-button {
        touch-action: none;
    }
    .shortcut-letter {
        color: var(--spectrum-global-color-gray-700);
        text-align: center;
        min-width: var(--spectrum-listitem-text-size);
    }
</style>