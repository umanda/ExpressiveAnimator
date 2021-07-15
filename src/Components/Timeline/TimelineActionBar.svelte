<script lang="ts">
    import {CurrentTimelineFilterMode,
        CurrentKeyframeSelection, CurrentProject, TimelineFilterMode} from "../../Stores";
    import SpSlider from "../../Controls/SpSlider.svelte";
    export let zoom: number = 1;

    function handleInput(event) {
        zoom = event.detail;
    }

    function onDelete() {
        const project = $CurrentProject;
        if (project.middleware.deleteSelectedKeyframes()) {
            project.middleware.updateAnimatedProperties(project.document);
            project.state.snapshot();
            project.engine?.invalidate();
        }
    }

</script>
<div class="timeline-action-bar">
    <div class="timeline-actions-left">
        <sp-action-menu value={$CurrentTimelineFilterMode.toString()}
                        on:change={e => $CurrentTimelineFilterMode = parseInt(e.target.value)}
                        size="s" class="very-small">
            <sp-icon slot="icon" size="s" name="workflow:Filter"></sp-icon>
            <sp-menu-item value="{TimelineFilterMode.AllAnimated.toString()}">Animated elements</sp-menu-item>
            <sp-menu-item value="{TimelineFilterMode.Selected.toString()}">Selected elements</sp-menu-item>
            <sp-menu-item value="{TimelineFilterMode.SelectedAndAnimated.toString()}">Selected & Animated elements</sp-menu-item>
        </sp-action-menu>
    </div>
    <div class="timeline-actions-right">
        <sp-action-button
                title="Delete keyframes"
                class="very-small"
                disabled={$CurrentKeyframeSelection.isEmpty}
                on:click={onDelete} size="s" quiet>
            <sp-icon slot="icon" size="s" name="workflow:Delete"></sp-icon>
        </sp-action-button>
        <div class="timeline-action-bar-zoom-wrapper">
            <SpSlider on:input={handleInput} min={0.05} max={2} step={0.01} decimals={2} value={zoom} />
        </div>
    </div>
</div>
<style global>
    .timeline-action-bar {
        display: flex;
        box-sizing: content-box !important;
        border-top: 2px solid var(--separator-color);
        width: 100%;
        height: var(--spectrum-alias-item-height-m);
        align-items: center;
    }
    .timeline-actions-left {
        width: 240px;
    }

    .timeline-actions-right {
        flex: 1;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-items: space-between;
    }

    .timeline-action-bar-zoom-wrapper {
        margin-left: auto;
        padding: 0 8px;
        width: 240px;
    }
</style>