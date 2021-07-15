<script lang="ts">
    import {createEventDispatcher, onDestroy, onMount, tick} from "svelte";
    import type {NumberField} from "@spectrum-web-components/number-field";
    import {getNumberFormatOptions, nextId, isInvalidNumber, getScaled, fixNumber} from "./utils";
    import SpTextFieldWrapper from "./SpTextFieldWrapper.svelte";

    const dispatch = createEventDispatcher();
    const idFallback: string = 'sp-number-field-id-' + nextId();

    export let value: number;
    export let label: string = undefined;
    export let labelPosition: 'start' | 'center' | 'end' = 'center';

    export let size: 's' | 'm' | 'l' | 'xl' = 'm';
    export let quiet: boolean = false;
    export let readonly: boolean = false;
    export let disabled: boolean = false;
    export let wrap: boolean = false;

    export let format: Intl.NumberFormatOptions | string = undefined;

    export let id: string = undefined;

    export let min: number = undefined;
    export let max: number = undefined;
    export let step: number = undefined;
    export let stepModifier: number = 10;
    export let decimals: number = 3;
    export let scale: number = 1;

    let input: NumberField = undefined;
    let focused: boolean = false;
    let started: boolean = false;
    let startValue: number = undefined;
    let formatOptions: object & {mul?: number};
    let currentScale: number = 1;


    function onFocus() {
        startValue = value;
        focused = true;
        dispatch('focus');
    }

    function onBlur() {
        if (isInvalidNumber(input.value)) {
            input.value = value;
        }

        if (startValue !== value) {
            dispatch('change', value);
        }
        startValue = undefined;

        if (started) {
            started = false;
            dispatch('end');
        }

        focused = false;
        dispatch('blur');
    }

    function onInput(e: InputEvent) {
        let number = (e.target as NumberField).value;
        if (isInvalidNumber(number)) {
            return;
        }

        if (!started) {
            started = true;
            dispatch('start');
        }

        number = fixNumber(number, min, max, currentScale, decimals);
        if (value !== number) {
            value = number;
            dispatch('input', value);
        }
    }

    function onKeyUp(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === 'Escape') {
            input.blur();
        }
    }

    onMount(async () => {
        await tick();
        input.focusElement.style.textAlign = 'var(--textfield-text-align, center)';
    });

    onDestroy(() => {
        if (focused && input) {
            onBlur();
        }
    });

    $: formatOptions = getNumberFormatOptions(format);
    $: currentScale = scale * (formatOptions.mul || 1);
    $: if (input != null && input.formatOptions !== formatOptions) {
        input.formatOptions = formatOptions;
    }
</script>
<SpTextFieldWrapper
        {...$$restProps}
        id={id || idFallback}
        size={size}
        label={label}
        labelPosition={labelPosition}
        wrap={wrap}
        disabled={disabled}
        >
    <svelte:fragment slot="before">
        <slot name="before" />
    </svelte:fragment>
    <sp-number-field
            bind:this={input}
            class="textfield-input"
            value={getScaled(value, currentScale)}
            min={getScaled(min, currentScale)}
            max={getScaled(max, currentScale)}
            step={getScaled(step, currentScale)}
            step-modifier="{stepModifier}"

            on:focus={onFocus}
            on:blur={onBlur}
            on:input={onInput}
            on:keyup={onKeyUp}
            on:contextmenu

            id="{id || idFallback}"
            size="{size}"
            quiet={quiet}
            readonly={readonly}
            disabled={disabled}

            hide-stepper
            autocomplete="off"
    ></sp-number-field>
    <svelte:fragment slot="after">
        <slot name="after" />
    </svelte:fragment>
</SpTextFieldWrapper>
