<script lang="ts">
    import CascadeMenu from "../CascadeMenu";

    export let items: any[];
    export let readonly: boolean = false;

    let open: boolean = false;
</script>
<overlay-trigger placement="bottom-end"
                 type="modal"
                 offset={-6}
                 on:sp-closed={() => open = false}
    >
    <sp-action-button disabled={readonly} on:click={() => open = true} slot="trigger">
        <sp-icon size="s" name="workflow:ShowMenu" slot="icon"></sp-icon>
    </sp-action-button>
    <CascadeMenu on:action open={open} items={open ? items: []} slot="click-content" />
</overlay-trigger>