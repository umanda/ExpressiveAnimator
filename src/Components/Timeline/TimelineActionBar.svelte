<script lang="ts">
    import {CurrentTimelineFilterMode,
        CurrentKeyframeSelection, CurrentProject, TimelineFollowMode, TimelineFilterMode} from "../../Stores";
    import SpSlider from "../../Controls/SpSlider.svelte";
    import {deleteSelectedKeyframes} from "../../actions";
    export let zoom: number = 1;

    function handleInput(event) {
        zoom = event.detail;
    }

    function onDelete() {
        deleteSelectedKeyframes($CurrentProject);
    }

    function setEasing(e: Event & {target: HTMLElement}) {
        const project = $CurrentProject;
        const easing = e.target.getAttribute('data-easing');

        if (project.middleware.setEasingForSelectedKeyframes(easing)) {
            project.middleware.updateAnimatedProperties(project.document);
            project.state.snapshot();
        }
    }

    let disableEasing: boolean;
    $: disableEasing = $CurrentKeyframeSelection.length < 2;

</script>
<div class="timeline-action-bar">
    <div class="timeline-actions-left">
        <sp-action-menu
                        selects="single"
                        title="Filter elements"
                        value={$CurrentTimelineFilterMode.toString()}
                        on:change={e => $CurrentTimelineFilterMode = parseInt(e.target.value)}
                        size="s" class="very-small">
            <sp-icon slot="icon" size="s" name="{$CurrentTimelineFilterMode === TimelineFilterMode.AllSelectedOrAnimated ? 'workflow:Filter' : 'workflow:FilterCheck'}"></sp-icon>
            <sp-menu-item value="{TimelineFilterMode.AllSelectedOrAnimated.toString()}">All Selected or Animated elements</sp-menu-item>
            <sp-menu-divider></sp-menu-divider>
            <sp-menu-item value="{TimelineFilterMode.OnlySelected.toString()}">Only Selected elements</sp-menu-item>
            <sp-menu-item value="{TimelineFilterMode.OnlyAnimated.toString()}">Only Animated elements</sp-menu-item>
            <sp-menu-item value="{TimelineFilterMode.OnlySelectedAndAnimated.toString()}">Only Selected and Animated elements</sp-menu-item>
        </sp-action-menu>
        <sp-action-button
                        title="Follow active element"
                        size="s" quiet class="very-small"
                          selected={$TimelineFollowMode}
                          on:click={() => $TimelineFollowMode = !$TimelineFollowMode}>
            <sp-icon slot="icon" size="s" name="{$TimelineFollowMode ? 'workflow:Follow' : 'workflow:FollowOff'}"></sp-icon>
        </sp-action-button>
    </div>
    <div class="timeline-actions-right">
        <sp-action-button
                title="Linear"
                data-easing="linear"
                disabled={disableEasing}
                on:click={setEasing} size="s" quiet class="very-small">
            <sp-icon slot="icon" size="s" name="expr:ease-linear"></sp-icon>
        </sp-action-button>
        <sp-action-button
                title="Step End"
                data-easing="step-end"
                disabled={disableEasing}
                on:click={setEasing} size="s" quiet class="very-small">
            <sp-icon slot="icon" size="s" name="expr:ease-step-end"></sp-icon>
        </sp-action-button>
        <sp-action-button
                title="Step Start"
                data-easing="step-start"
                disabled={disableEasing}
                on:click={setEasing} size="s" quiet class="very-small">
            <sp-icon slot="icon" size="s" name="expr:ease-step-start"></sp-icon>
        </sp-action-button>
        <sp-divider size="s" vertical style="height: 24px;"></sp-divider>
        <sp-action-button
                title="Ease In Out"
                data-easing="ease-in-out"
                disabled={disableEasing}
                on:click={setEasing} size="s" quiet class="very-small">
            <sp-icon slot="icon" size="s" name="expr:ease-in-out"></sp-icon>
        </sp-action-button>
        <sp-action-button
                title="Ease In"
                data-easing="ease-in"
                disabled={disableEasing}
                on:click={setEasing} size="s" quiet class="very-small">
            <sp-icon slot="icon" size="s" name="expr:ease-in"></sp-icon>
        </sp-action-button>
        <sp-action-button
                title="Ease Out"
                data-easing="ease-out"
                disabled={disableEasing}
                on:click={setEasing} size="s" quiet class="very-small">
            <sp-icon slot="icon" size="s" name="expr:ease-out"></sp-icon>
        </sp-action-button>
        <sp-divider size="s" vertical style="height: 24px;"></sp-divider>
        <sp-action-button
                title="Delete keyframes"
                disabled={$CurrentKeyframeSelection.isEmpty}
                on:click={onDelete} size="s" quiet class="very-small">
            <sp-icon slot="icon" size="s" name="workflow:Delete"></sp-icon>
        </sp-action-button>
        <div class="timeline-action-bar-zoom-wrapper">
            <SpSlider labelVisibility="none" on:input={handleInput} min={0.05} max={2} step={0.01} decimals={2} value={zoom} />
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
        display: flex;
        gap: var(--spectrum-global-dimension-size-100);
    }

    .timeline-actions-left > :first-child {
        margin-left: var(--spectrum-global-dimension-size-100);
    }
    .timeline-actions-left > :last-child {
        margin-right: var(--spectrum-global-dimension-size-100);
    }

    .timeline-actions-right {
        flex: 1;
        gap: var(--spectrum-global-dimension-size-100);
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .timeline-action-bar-zoom-wrapper {
        margin-left: auto;
        padding: 0 var(--spectrum-global-dimension-size-100);
        width: 240px;
    }
</style>