<script lang="ts">
    import {CurrentProject, IsProjectSaved} from "../../Stores";
    import {undo, redo, showOpenDialog, saveProject} from "../../actions";
    import GlobalMenu from "./GlobalMenu.svelte";
    import type {State} from "@zindex/canvas-engine";

    export let readonly: boolean = false;
    export let menu: any[];

    async function open() {
        await showOpenDialog();
    }

    async function save() {
        await saveProject();
    }

    let state: State<any, any, any>;
    $: state = $CurrentProject?.state;
</script>
<sp-action-group compact quiet>
    <GlobalMenu on:action items={menu} readonly={readonly} />
    <sp-action-button title="Open" on:click={open} disabled={readonly}>
        <sp-icon size="s" name="workflow:FolderOpen" slot="icon"></sp-icon>
    </sp-action-button>
    <sp-action-button title="Save" on:click={save} disabled={readonly || $IsProjectSaved}>
        <sp-icon size="s" name="workflow:SaveFloppy" slot="icon"></sp-icon>
    </sp-action-button>
    <sp-action-button title="Undo"
                      on:click={undo}
                      disabled={readonly || !state || !state.canUndo}>
        <sp-icon size="s" name="workflow:Undo" slot="icon"></sp-icon>
    </sp-action-button>
    <sp-action-button title="Redo"
                      on:click={redo}
                      disabled={readonly || !state || !state.canRedo}>
        <sp-icon size="s" name="workflow:Redo" slot="icon"></sp-icon>
    </sp-action-button>
</sp-action-group>