<script lang="ts">
    import type {GradientBrush, StopColorList} from "@zindex/canvas-engine";
    import ColorStops from "./ColorStops.svelte";
    import {createEventDispatcher} from "svelte";
    import {SpreadMethod} from "@zindex/canvas-engine";
    import type {GradientSlider} from "../../../SpectrumExtra/GradientSlider";

    const dispatch = createEventDispatcher();

    export let value: GradientBrush;
    export let readonly: boolean = false;
    export let slider: GradientSlider = undefined;

    function dispatchStart() {
        dispatch('start', value);
    }

    function onColorStopUpdate(e: CustomEvent<StopColorList>) {
        dispatch('update', value.withStopColorList(e.detail));
    }

    function onSpreadUpdate(e: CustomEvent<string>) {
        dispatch('update', value.withSpreadMethod(parseInt(e.target.value) as SpreadMethod));
    }
</script>
<ColorStops
        on:start={dispatchStart}
        on:update={onColorStopUpdate}
        on:end
        bind:slider
        value={value.stopColors}
        readonly={readonly}>
    <div class="gradient-options">
        <sp-action-group compact quiet class="very-small">
            <overlay-trigger placement="bottom-start" type="modal" offset={-3} style="transform: translateX(-6px)">
                <sp-action-button disabled={readonly} slot="trigger" quiet size="s" class="very-small">
                    <sp-icon name="workflow:Settings" slot="icon"></sp-icon>
                </sp-action-button>
                <sp-popover dialog slot="click-content" open style="--spectrum-popover-dialog-padding: 6px; --spectrum-popover-dialog-min-width: 0px">
                    <div class="gradient-settings">
                        <slot />
                    </div>
                </sp-popover>
            </overlay-trigger>
            <sp-action-button on:click={e => slider.reverseStops(e.altKey)} title="Reverse color stops" size="s" disabled={readonly}>
                <sp-icon slot="icon" name="expr:switch-horizontal"></sp-icon>
            </sp-action-button>
            <sp-action-button on:click={() => slider.removeCurrentHandle()} title="Delete color stop" size="s" disabled={readonly || value.stopColors.length <= 2}>
                <sp-icon slot="icon" name="workflow:Delete"></sp-icon>
            </sp-action-button>
        </sp-action-group>
        <sp-picker title="Spread method" readonly={readonly} on:change={onSpreadUpdate}
                        value={value.spread.toString()} size="s">
            <sp-menu-item value={SpreadMethod.Pad.toString()}>Pad</sp-menu-item>
            <sp-menu-item value={SpreadMethod.Repeat.toString()}>Repeat</sp-menu-item>
            <sp-menu-item value={SpreadMethod.Reflect.toString()}>Reflect</sp-menu-item>
        </sp-picker>
    </div>
</ColorStops>
<style>
    .gradient-options {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }

    .gradient-settings {
        width: 234px;
        user-select: none;
        color: var(--spectrum-global-color-gray-800);
    }

    sp-picker {
        width: var(--spectrum-global-dimension-size-1000);
    }
</style>
