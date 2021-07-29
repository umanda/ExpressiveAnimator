<svelte:options immutable={true} />
<script lang="ts">
    import type {Slider} from "@spectrum-web-components/slider";
    import type {NumberField} from "@spectrum-web-components/number-field";

    import {createEventDispatcher, onDestroy, onMount, tick} from "svelte";
    import {fixNumber, isInvalidNumber, getScaled, getNumberFormatOptions} from "./utils";

    const dispatch = createEventDispatcher();

    export let value: number;

    export let label: string = undefined;
    export let variant: 'filled' | 'ramp' | 'range' | 'tick' = undefined;
    export let tickStep: number = undefined;
    export let tickLabels: boolean = false;
    export let format: Intl.NumberFormatOptions | string = undefined;

    export let min: number = 0;
    export let max: number = 100;
    export let step: number = undefined;
    export let stepModifier: number = 10;
    export let scale: number = 1;
    export let decimals: number = 3;
    export let allowOverflow: boolean = false;
    export let allowUnderflow: boolean = false;

    export let disabled: boolean = false;
    export let readonly: boolean = false;
    export let editable: boolean = false;

    let slider: Slider = undefined;
    let input: NumberField = undefined;

    let focused: boolean = false;
    let started: boolean = false;
    let startValue: number = undefined;
    let formatOptions: object & {mul?: number};
    let currentScale: number = 1;

    function onFocus() {
        if (focused) {
            // already focused
            return;
        }

        focused = true;
        startValue = value;
        dispatch('focus');
    }

    function onBlur() {
        if (!focused || slider.dragging) {
            // pointer was captured
            return;
        }

        focused = false;
        onFinish();
        dispatch('blur');
    }

    function restoreElementValue(el: Slider | NumberField) {
        requestAnimationFrame(() => el.value = getScaled(value, currentScale));
    }

    function onInput(e: InputEvent) {
        const target = e.target as (Slider | NumberField);
        if (readonly) {
            restoreElementValue(target);
            return;
        }

        let number = target.nodeName === 'SP-SLIDER'
            ? (target.focusElement as HTMLInputElement).valueAsNumber
            : target.value;
        if (isInvalidNumber(number)) {
            return;
        }

        if (!started) {
            started = true;
            startValue = value;
            dispatch('start');
        }

        number = fixNumber(number, allowUnderflow ? null : min, allowOverflow ? null : max, currentScale, decimals);
        if (value !== number) {
            value = number;
            dispatch('input', value);
        } else if (target.value !== value) {
            restoreElementValue(target);
        }
    }

    function onFinish() {
        if (isInvalidNumber(slider.value)) {
            slider.value = value;
            if (input) {
                input.value = value;
            }
        }

        if (startValue !== value) {
            dispatch('change', value);
        }
        startValue = undefined;

        if (started) {
            started = false;
            dispatch('end');
        }
    }

    let hideLabel: boolean;
    $: hideLabel = !editable && (label == null);

    $: formatOptions = getNumberFormatOptions(format);
    $: currentScale = scale * (formatOptions.mul || 1);
    $: if (input != null && input.formatOptions !== formatOptions) {
        input.formatOptions = formatOptions;
    }
    $: if (slider != null && slider.formatOptions !== formatOptions) {
        slider.formatOptions = formatOptions;
    }

    onMount(async () => {
        await tick();
        if (input != null) {
            input.focusElement.style.textAlign = 'right';
            input.focusElement.spellcheck = false;
            input.focusElement.autocomplete = "off";
        }
    });
    onDestroy(() => {
        if (focused && slider) {
            onBlur();
        }
    });
</script>
<sp-slider
        {...$$restProps}
        class:no-label={hideLabel}
        bind:this={slider}
        value={getScaled(value, currentScale)}
        min={getScaled(min, currentScale)}
        max={getScaled(max, currentScale)}
        step={getScaled(step || 1, currentScale)}

        label={label}
        hide-value-label={hideLabel ? '' : undefined}
        variant={variant}
        tickStep={tickStep}
        tickLabels={tickLabels}

        disabled={disabled}
        readonly={readonly}

        on:input={onInput}
        on:focus={onFocus}
        on:blur={onBlur}
        on:pointerup={onFinish}
>
    {#if editable}
        <sp-number-field
                bind:this={input}
                slot="edit"

                on:input={onInput}
                on:focus={onFocus}
                on:blur={onBlur}

                class="slider-textfield"
                value={getScaled(value, currentScale)}
                min={getScaled(allowUnderflow ? undefined : min, currentScale)}
                max={getScaled(allowOverflow ? undefined : max, currentScale)}
                step={getScaled(step, currentScale)}
                step-modifier={stepModifier}
                readonly={readonly}
                disabled={disabled}
                tabindex="-1"
                quiet
                hide-stepper
        ></sp-number-field>
    {/if}
</sp-slider>
<style>
    sp-slider.no-label {
        --spectrum-fieldlabel-m-padding-top: 0;
    }

    .slider-textfield {
        vertical-align: bottom;
        --spectrum-textfield-m-min-width: var(--spectrum-global-dimension-size-1000);
        --spectrum-textfield-quiet-border-size: 0 !important;
        --spectrum-textfield-m-border-color-key-focus: transparent;

        --spectrum-textfield-m-text-size: var(--spectrum-global-dimension-font-size-75);
        --spectrum-textfield-m-height: 100%;
        --spectrum-textfield-m-padding-left: 0;
        --spectrum-textfield-m-padding-right: 0;
    }
</style>