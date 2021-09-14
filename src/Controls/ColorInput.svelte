<script lang="ts">
    import {Color} from "@zindex/canvas-engine";
    import ColorComponent from "./ColorComponent.svelte";

    export let disabled: boolean = false;
    export let value: Color;

    let open: boolean = false;
</script>
<overlay-trigger placement="top-start"
                 type="modal"
                 offset={-6}
                 on:sp-closed={() => open = false}
>
    <sp-action-button title="Add animator"
                      on:click={() => open = true}
                      disabled={disabled} slot="trigger">
        <sp-icon size="m" name="expr:add-color" slot="icon"></sp-icon>
    </sp-action-button>
    <sp-popover slot="click-content" open={open}>
        <ColorComponent value={value} readonly={disabled} />
    </sp-popover>
</overlay-trigger>