<script lang="ts">
    import NodeJoints from "./NodeJoints.svelte";
    import PathOptions from "./PathOptions.svelte";
    import {CurrentTool, CurrentSelection, CurrentProject, notifySelectionChanged} from "../../Stores";
    import type {PathJoint, Selection} from "@zindex/canvas-engine";
    import type {AnimationDocument, PathTool} from "../../Core";
    import {
        ClipPathElement,
        PathElement,
        VectorElement,
        PathOperation,
        ShapeElement,
    } from "@zindex/canvas-engine";
    import {AnimationProject, TransformTool} from "../../Core";
    import {showToast} from "../../actions";

    export let readonly: boolean = false;

    let canChangePathJoint: boolean = false;
    let canChangeMotionPathJoint: boolean = false;
    let selectedVectors: number = 0;
    let selectedPathElements: number = 0;

    // function groupContainsVectors(group: GroupElement): boolean {
    //     if (!group.hasChildren) {
    //         return false;
    //     }
    //
    //     for (const el of group.children()) {
    //         if (el instanceof VectorElement) {
    //             return true;
    //         }
    //         if ((el instanceof GroupElement) && groupContainsVectors(el)) {
    //             return true;
    //         }
    //     }
    //
    //     return false;
    // }

    function updateButtonsState(selection: Selection<AnimationDocument>) {
        if (selection.isEmpty) {
            // we cannot set joints
            canChangePathJoint = false;
            canChangeMotionPathJoint = false;
            // minimum number of vectors
            selectedVectors = 0;
            // number of selected path elements
            selectedPathElements = 0;
            return;
        }

        let hasPaths: boolean = false;
        let shapes: number = 0;

        selectedPathElements = selectedVectors = 0;

        for (const el of selection) {
            if (el instanceof PathElement) {
                selectedVectors++;
                shapes++;
                selectedPathElements++;
                hasPaths = true;
            } else if (el instanceof ShapeElement) {
                shapes++;
                selectedVectors++;
            } else if (el instanceof VectorElement) {
                selectedVectors++;
            } else if (el instanceof ClipPathElement) {
                hasPaths = true;
            }
        }

        // if we have paths we can set joints
        canChangePathJoint = hasPaths;

        // if we have animation and keyframes we can change joints
        canChangeMotionPathJoint = (selection.activeElement.document as AnimationDocument)?.animation?.isPropertyAnimated(selection.activeElement, "position", 1);
    }

    function onPathJoint(e: CustomEvent<PathJoint>) {
        const tool = $CurrentTool as PathTool;
        if (tool.selection.isEmpty) {
            showToast("Select some nodes");
            return;
        }

        const project = $CurrentProject;
        if (tool.changeJoint(project.engine, e.detail)) {
            project.state.snapshot();
            project.engine?.invalidate();
        }
    }

    function onPathExtra(e: CustomEvent<{type: string, alt: boolean}>) {
        const tool = $CurrentTool as PathTool;
        if (tool.selection.isEmpty) {
            showToast("Select some nodes");
            return;
        }

        const project = $CurrentProject;

        let changed: boolean = false;
        switch (e.detail.type) {
            case "break":
                changed = tool.breakNodes(project.engine);
                break;
            case "join":
                changed = tool.closePaths(project.engine, e.detail.alt);
                break;
        }

        if (changed) {
            project.state.snapshot();
            project.engine?.invalidate();
        }
    }

    function onMotionPathJoint(e: CustomEvent<PathJoint>) {
        if (($CurrentTool instanceof TransformTool) && $CurrentTool.changeJointType(e.detail)) {
            const project = $CurrentProject;
            project.state.snapshot();
            project.engine?.invalidate();
        }
    }

    let currentOp: string = 'unite';

    const opMap = {
        'unite': PathOperation.Unite,
        'subtract-back': PathOperation.SubtractBack,
        'subtract-front': PathOperation.SubtractFront,
        'intersect': PathOperation.Intersect,
        'exclude': PathOperation.Exclude,
    };

    function onPathOp(e: CustomEvent<{ value: string, activeAsTarget: boolean, keepOriginal: boolean, reverse: boolean }>) {
        const project = $CurrentProject as AnimationProject;
        if (project.middleware.toolIsWorking) {
            return null;
        }

        let element = null;

        if (e.detail.value in opMap) {
            element = project.middleware.applyPathOpToSelection(opMap[e.detail.value], e.detail.activeAsTarget, e.detail.keepOriginal, e.detail.reverse);
        } else {
            switch (e.detail.value) {
                case 'merge':
                    element = project.middleware.mergeSelectedPaths(e.detail.activeAsTarget, e.detail.keepOriginal, e.detail.reverse);
                    break;
                case 'split':
                    element = project.middleware.splitSelectedPaths(e.detail.keepOriginal);
                    break;
                case 'divide':
                    element = project.middleware.divideSelectedPaths(e.detail.activeAsTarget, e.detail.keepOriginal, e.detail.reverse);
                    break;
                case 'outline':
                    // here reverse means keepOriginalPath
                    element = project.middleware.outlineSelectedPaths(e.detail.keepOriginal, e.detail.reverse);
                    break;
            }
        }

        if (!element) {
            return null;
        }

        project.state.snapshot();
        if (Array.isArray(element)) {
            if (project.selection.selectMultiple(element)) {
                notifySelectionChanged();
            }
        } else if (project.selection.select(element, false)) {
            notifySelectionChanged();
        }
        project.keyframeSelection.clear();
        project.engine?.invalidate();

        return element;
    }

    function onNodePathOp(e: CustomEvent<{ value: string, activeAsTarget: boolean, keepOriginal: boolean, reverse: boolean }>) {
        if (onPathOp(e)) {
            ($CurrentTool as PathTool).selection.clear();
        }
    }

    $: if ($CurrentSelection) {
        // update buttons state
        updateButtonsState($CurrentSelection);
        if ($CurrentTool != null && $CurrentTool.name === 'path') {
            // cleanup node selection when element selection changes
            ($CurrentTool as PathTool).cleanupSelection($CurrentSelection);
        }
    }
</script>
{#if $CurrentTool != null}
    {#if $CurrentTool.name === 'selection'}
        <PathOptions on:input={onPathOp} disabled={readonly} selectedVectors={selectedVectors} selectedPaths={selectedPathElements} bind:current={currentOp} />
    {:else if $CurrentTool.name === 'transform'}
        <NodeJoints on:input={onMotionPathJoint} disabled={readonly || !canChangeMotionPathJoint} />
    {:else if $CurrentTool.name === 'path'}
        <NodeJoints on:extra={onPathExtra} on:input={onPathJoint} disabled={readonly || !canChangePathJoint} showExtra={true} />
        <PathOptions on:input={onNodePathOp} disabled={readonly} selectedVectors={selectedVectors} selectedPaths={selectedPathElements} bind:current={currentOp} />
    {/if}
{/if}