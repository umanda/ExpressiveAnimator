<script lang="ts">
    import type {Color} from "@zindex/canvas-engine";
    import ColorComponent from "../../../Controls/ColorComponent.svelte";
    import {createEventDispatcher, onDestroy, tick} from "svelte";
    import {StopColorList} from "@zindex/canvas-engine";
    import type {GradientSlider} from "../../../SpectrumExtra/GradientSlider";

    const dispatch = createEventDispatcher();

    export let value: StopColorList;
    export let disabled: boolean = false;
    export let readonly: boolean = false;

    export let slider: GradientSlider = undefined;

    let started: boolean = false;
    let currentColor: Color;

    function onEdit(e: CustomEvent<boolean>) {
        if (e.detail) {
            if (!started) {
                started = true;
                dispatch('start', value);
            }
            currentColor = slider.color;
        } else if (started) {
            started = false;
            dispatch('end');
        }
    }

    function updateCurrentColor() {
        currentColor = slider.color;
    }

    async function onColorStart() {
        // restart
        if (slider.edit) {
            slider.edit = false;
        }

        await tick();

        slider.edit = true;

        currentColor = slider.color;
    }

    function onColorStop() {
        slider.edit = false;
        currentColor = slider.color;
    }

    function onColorInput(e: CustomEvent<Color>) {
        slider.color = currentColor = e.detail;
    }

    onDestroy(() => {
        if (started) {
            started = false;
            dispatch('end');
            slider.edit = false;
        }
    });
</script>
<ColorComponent
        on:start={onColorStart}
        on:end={onColorStop}
        on:update={onColorInput}
        value={currentColor || value.list[0].color}
        readonly={readonly}
>
    <sp-gradient-slider
            bind:this={slider}
            value={value}
            on:edit={onEdit}
            on:select={updateCurrentColor}
            on:add={updateCurrentColor}
            on:remove={updateCurrentColor}
            on:value={updateCurrentColor}
            on:update
            disabled={disabled}
            readonly={readonly}
            small
    ></sp-gradient-slider>
    <slot />
</ColorComponent>
<style>
    sp-gradient-slider {
        width: auto;
        margin-left: var(--spectrum-global-dimension-size-125);
        margin-right: var(--spectrum-global-dimension-size-125);
    }
</style>