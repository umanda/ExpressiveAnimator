<script lang="ts">
    import {rgbToHsv, TinyColor} from "@ctrl/tinycolor";
    import {createEventDispatcher} from "svelte";
    import SpAlphaSlider from "./SpAlphaSlider.svelte";
    import {parseColor} from "@zindex/canvas-engine";
    import SpTextField from "./SpTextField.svelte";

    const dispatch = createEventDispatcher();

    export let value: TinyColor;
    export let size: number = 180;
    export let details: boolean = true;
    export let mode: 'HEX' | 'RGB' | 'HSL' | 'HSV' = 'HEX';
    export let readonly: boolean = false;

    let hsva = {h: 0, s: 0, v: 0, a: 1};
    let currentColor: TinyColor;
    let alphaTemplate: string;
    let colorString: string;

    function onStart() {
        dispatch('start', value);
    }

    function onEdit(e: CustomEvent<boolean>) {
        if (e.detail) {
            dispatch('start', value);
        } else {
            dispatch('end');
        }
    }

    function onHue(e: CustomEvent<number>) {
        hsva.h = e.detail;
        onChange();
    }

    function onSV(e: CustomEvent) {
        hsva.s = e.detail.s;
        hsva.v = e.detail.v;
        onChange();
    }

    function onColorChange(value: TinyColor) {
        if (!value) {
            return;
        }

        const hsv = value.toHsv();

        hsva.a = hsv.a;
        hsva.v = Math.round(hsv.v * 100) / 100;

        if (hsv.v === 0 && hsva.v === 0 || hsv.s === 0 && hsva.s === 0) {
            return;
        }

        hsva.h = Math.round(hsv.h);
        hsva.s = Math.round(hsv.s * 100) / 100;
    }

    function onChange() {
        const color = new TinyColor(hsva, {format: 'rgb'});
        if (value.toRgbString() !== color.toRgbString()) {
            dispatch('input', color);
        }
    }

    function onColorInput(e) {
        const color = parseColor(e.detail);
        if (color.ok) {
            const hsv = rgbToHsv(color.r, color.g, color.b);
            hsva.a = color.a ?? 1;
            hsva.h = hsv.h * 360;
            hsva.s = hsv.s;
            hsva.v = hsv.v;
            dispatch('start');
            onChange();
            dispatch('end');
        }
    }

    function getColorString(mode: string, color: TinyColor): string {
        switch (mode) {
            case 'RGB':
                return color.toRgbString();
            case 'HSV':
                return color.toHsvString();
            case 'HSL':
                return color.toHslString();
            default:
                return color.a !== 1 ? color.toHex8String(true) : color.toHexString(true);
        }
    }

    $: onColorChange(value);
    $: currentColor = new TinyColor(hsva, {format: 'hsv'});
    $: colorString = details ? getColorString(mode, currentColor) : null;
    $: {
        const rgb = currentColor.toRgb();
        alphaTemplate = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, %alpha)`;
    }
</script>
<div class="color-control">
    <div class="color-control-wheel" style={`--color-control-slider-size: ${size - 2 * 16}px;`}>
        <sp-color-wheel on:edit={onEdit} on:input={onHue} value={hsva.h} thickness={16} readonly={readonly}>
            <sp-color-area
                    hue={hsva.h}
                    x={hsva.s}
                    y={1 - hsva.v}
                    on:edit={onEdit}
                    on:input={onSV}
                    readonly={readonly}
            ></sp-color-area>
        </sp-color-wheel>
        <SpAlphaSlider on:start={onStart} on:end on:update={onChange} bind:value={hsva.a} colorTemplate={alphaTemplate} readonly={readonly} small vertical invert/>
    </div>
    {#if details}
        <SpTextField
                size="s"
                on:change={onColorInput}
                value={colorString}
                readonly={readonly}
                class="has-after flex-input"
                wrap={true}
        >
            <svelte:fragment slot="after">
                <sp-picker
                        readonly={readonly}
                        value="{mode}"
                        size="s"
                        on:change={e => mode = e.target.value}
                        style="--spectrum-picker-width: var(--spectrum-global-dimension-size-1000);"
                >
                    <sp-menu-item value="HEX">HEX</sp-menu-item>
                    <sp-menu-item value="RGB">RGB</sp-menu-item>
                    <sp-menu-item value="HSV">HSV</sp-menu-item>
                    <sp-menu-item value="HSL">HSL</sp-menu-item>
                </sp-picker>
            </svelte:fragment>
        </SpTextField>
    {/if}
    <slot />
</div>
<style>
    .color-control {
        display: flex;
        flex-direction: column;
        gap: var(--spectrum-global-dimension-size-125);
    }

    .color-control-wheel {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-around;
        --spectrum-colorslider-vertical-default-length: var(--color-control-slider-size);
    }
</style>
