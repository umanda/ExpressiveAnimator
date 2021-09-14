<script lang="ts">
    import {CurrentProject, CurrentDocument, CurrentSelection, ShowTreeReverse, IsPlaying, notifySelectionChanged} from "../Stores";
    import type {Element, Document, MoveElementMode, Selection} from "@zindex/canvas-engine";
    import SpTreeView from "../Controls/SpTreeView";
    import {ElementInfoMap} from "../Core";
    import EditElementNameDialog from "./Dialogs/EditElementNameDialog.svelte";
    import {getContext} from "svelte";
    import {
        deleteSelectedElements,
        duplicateSelectedElements,
        groupSelected,
        showDialog,
        unGroupSelected
    } from "../actions";

    export let collapsed: boolean = false;

    let noSelection: boolean;
    $: noSelection = !$CurrentSelection || $CurrentSelection.isEmpty;

    function onSelection() {
        $CurrentProject.engine?.invalidate();
        notifySelectionChanged();
    }

    function onDrop(e: CustomEvent<{element: Element, target: Element, mode: MoveElementMode, selection: Selection<Document>}>) {
        if ($CurrentProject.middleware.toolIsWorking) {
            return;
        }
        if ($CurrentProject.middleware.sendToTarget(e.detail.element, e.detail.target, e.detail.mode, e.detail.selection)) {
            snapshot();
        }
    }

    function onLock(e: CustomEvent<Element>) {
        if ($CurrentProject.middleware.toolIsWorking) {
            return;
        }
        e.detail.locked = !e.detail.locked;
        snapshot();
    }

    function onHide(e: CustomEvent<Element>) {
        if ($CurrentProject.middleware.toolIsWorking) {
            return;
        }
        e.detail.hidden = !e.detail.hidden;
        snapshot();
    }

    async function onEditTitle(e: CustomEvent<Element>) {
        if ($CurrentProject.middleware.toolIsWorking) {
            return;
        }

        const value = e.detail.title || '';
        const title = await showDialog<string>(EditElementNameDialog, {
            title: 'Rename element',
            dismissable: false,
            size: 's',
            confirm: {
                label: 'Rename',
                action: async (value: string) => value.trim()
            },
            cancel: {
                label: 'Cancel'
            },
            value,
        });

        if (title !== value) {
            e.detail.title = title;
            $CurrentProject.state.snapshot();
        }
    }

    function onDelete() {
        deleteSelectedElements($CurrentProject);
    }

    function doGroup() {
        groupSelected($CurrentProject);
    }

    function doUngroup(e: PointerEvent) {
        unGroupSelected($CurrentProject, !e.altKey);
    }

    function doDuplicate() {
        duplicateSelectedElements($CurrentProject);
    }

    function snapshot() {
        const project = $CurrentProject;
        project.state.snapshot();
        project.engine?.invalidate();
    }

    function clearSelection() {
        if ($CurrentSelection.clear()) {
            notifySelectionChanged();
            $CurrentProject.engine?.invalidate();
        }
    }
</script>
<div on:focusin on:contextmenu class="tree-wrapper">
    {#if !collapsed}
        <div class="scroll scroll-no-hide" on:click|self={clearSelection}>
            <SpTreeView
                    reverse={$ShowTreeReverse}
                    document={$CurrentDocument}
                    selection={$CurrentSelection}
                    infoMap={ElementInfoMap}
                    readonly={$IsPlaying}
                    on:title={onEditTitle}
                    on:drop={onDrop}
                    on:lock={onLock}
                    on:hide={onHide}
                    on:selection={onSelection} />
        </div>
        <div class="tree-tools">
            <sp-action-button quiet title="Duplicate" on:click={doDuplicate} disabled={noSelection || $IsPlaying} size="s" class="very-small">
                <sp-icon size="s" name="workflow:Duplicate" slot="icon"></sp-icon>
            </sp-action-button>
            <sp-action-button quiet title="Group" on:click={doGroup} disabled={noSelection || $IsPlaying} size="s" class="very-small">
                <sp-icon size="s" name="workflow:Group" slot="icon"></sp-icon>
            </sp-action-button>
            <sp-action-button quiet title="Ungroup" on:click={doUngroup} disabled={noSelection || $IsPlaying} size="s" class="very-small">
                <sp-icon size="s" name="workflow:Ungroup" slot="icon"></sp-icon>
            </sp-action-button>
            <div style="flex: 1"></div>
            <sp-action-button quiet title="Delete elements" on:click={onDelete} disabled={noSelection || $IsPlaying} size="s" class="very-small">
                <sp-icon size="s" name="workflow:Delete" slot="icon"></sp-icon>
            </sp-action-button>
            <!--{#if $CurrentDocument}-->
            <!--    <sp-picker readonly={$IsPlaying} size="s" value="{$CurrentDocument.id}" quiet>-->
            <!--        {#each Array.from($CurrentProject.getDocuments()) as doc (doc.id)}-->
            <!--            <sp-menu-item value="{doc.id}">{doc.title || '(document)'}</sp-menu-item>-->
            <!--        {/each}-->
            <!--    </sp-picker>-->
            <!--{/if}-->
        </div>
    {/if}
</div>
<style>
    .tree-wrapper {
        display: flex;
        flex-direction: column;
    }

    .tree-wrapper > .scroll {
        flex: 1;
        padding: 0 !important;
        margin-left: calc(var(--scrollbar-width) / 2);
    }

    .tree-tools {
        overflow: hidden;
        display: flex;
        gap: var(--spectrum-global-dimension-size-100);
        flex-direction: row;
        align-items: center;
        box-sizing: content-box;
        border-top: 2px solid var(--separator-color);
        height: var(--spectrum-alias-item-height-m);
    }
    .tree-tools > :first-child {
        margin-left: var(--spectrum-global-dimension-size-100);
    }
    .tree-tools > :last-child {
        margin-right: var(--spectrum-global-dimension-size-100);
    }
</style>