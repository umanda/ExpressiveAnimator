<script lang="ts">
    import {
        ProjectFileHandle,
        CurrentProject,
        CurrentProjectState,
        IsProjectSaved,
        notifySelectionChanged, notifyKeyframeSelectionChanged, CurrentTime
    } from "../../Stores";
    import {NativeAnimationExporter, NativeAnimationImporter} from "../../Core";
    import {tick} from "svelte";

    export let readonly: boolean = false;

    declare global {
        interface Window {
            showOpenFilePicker(): FileSystemFileHandle[];

            showSaveFilePicker(options?: any): FileSystemFileHandle;
        }
    }

    function undo() {
        if (readonly) {
            return;
        }
        const engine = $CurrentProject.engine;
        if (engine) {
            engine.undo();
        }
    }

    function redo() {
        if (readonly) {
            return;
        }
        const engine = $CurrentProject.engine;
        if (engine) {
            engine.redo();
        }
    }

    async function open() {
        if (readonly) {
            return;
        }

        if (!$IsProjectSaved) {
            // Ask user if they want to save the current project
        }

        let fileHandle: FileSystemFileHandle;

        try {
            [fileHandle] = await window.showOpenFilePicker();
        } catch (e) {
            return;
        }

        $ProjectFileHandle = fileHandle;
        const stream = (await fileHandle.getFile()).stream();
        const importer = new NativeAnimationImporter();
        const project = await importer.import(stream);
        importer.dispose();

        const old = $CurrentProject;
        if (old) {
            old.selection.clear();
            notifySelectionChanged();
            old.keyframeSelection.clear();
            notifyKeyframeSelectionChanged();
            old.engine?.stopRenderLoop();
        }
        $CurrentTime = 0;
        $CurrentProject = project;
        $IsProjectSaved = true;

        await tick();
        old.dispose();
    }

    async function save() {
        if (readonly) {
            return;
        }
        if (!$ProjectFileHandle) {
            try {
                $ProjectFileHandle = await window.showSaveFilePicker({
                    types: [
                        {
                            description: 'Expressive Animation files',
                            startIn: 'documents',
                            accept: {
                                'expressive/animation': ['.eaf']
                            }
                        }
                    ]
                });
            } catch {
                return;
            }
        }

        const exporter = new NativeAnimationExporter();
        const stream = await exporter.export($CurrentProject)
        await stream.pipeTo(await $ProjectFileHandle.createWritable());

        $IsProjectSaved = true;
        exporter.dispose();
    }
</script>
<sp-action-group compact quiet>
<!--    <GlobalMenu />-->
    <sp-action-button title="Open" on:click={open}>
        <sp-icon size="s" name="workflow:FolderOpen" slot="icon"></sp-icon>
    </sp-action-button>
    <sp-action-button title="Save" on:click={save}>
        <sp-icon size="s" name="workflow:SaveFloppy" slot="icon"></sp-icon>
    </sp-action-button>
    <sp-action-button title="Undo"
                      on:click={undo}
                      disabled={!$CurrentProjectState || !$CurrentProjectState.canUndo}>
        <sp-icon size="s" name="workflow:Undo" slot="icon"></sp-icon>
    </sp-action-button>
    <sp-action-button title="Redo"
                      on:click={redo}
                      disabled={!$CurrentProjectState || !$CurrentProjectState.canRedo}>
        <sp-icon size="s" name="workflow:Redo" slot="icon"></sp-icon>
    </sp-action-button>
</sp-action-group>