<script lang="ts">
    import {createEventDispatcher, onDestroy, onMount, tick} from "svelte";
    import type {Textfield} from "@spectrum-web-components/textfield";
    import {nextId} from "./utils";
    import SpTextFieldWrapper from "./SpTextFieldWrapper.svelte";

    const dispatch = createEventDispatcher();
    const idFallback: string = 'sp-text-field-id-' + nextId();

    export let value: string = '';
    export let label: string = undefined;
    export let labelPosition: 'start' | 'center' | 'end' = 'center';

    export let size: 's' | 'm' | 'l' | 'xl' = 'm';
    export let quiet: boolean = false;
    export let readonly: boolean = false;
    export let disabled: boolean = false;
    export let wrap: boolean = false;

    export let id: string = undefined;
    export let minlength: number = undefined;
    export let maxlength: number = undefined;
    export let pattern: string = undefined;
    export let placeholder: string = undefined;

    let input: Textfield = undefined;
    let focused: boolean = false;
    let started: boolean = false;
    let startValue: string = undefined;

    function onFocus() {
        startValue = value;
        focused = true;
        dispatch('focus');
    }

    function onBlur() {
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
        value = (e.target as Textfield).value;

        if (!started) {
            started = true;
            dispatch('start');
        }

        dispatch('input', value);
    }

    function onKeyUp(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === 'Escape') {
            input.blur();
        }
    }

    onMount(async () => {
        await tick();
        input.focusElement.spellcheck = false;
        input.focusElement.style.textAlign = 'var(--textfield-text-align, center)';
    });

    onDestroy(() => {
        if (focused && input) {
            onBlur();
        }
    });
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
    <sp-textfield
            bind:this={input}
            class="textfield-input"
            value={value}
            minlength={minlength}
            maxlength={maxlength}
            pattern={pattern}
            placeholder={placeholder}

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

            autocomplete="off"
    ></sp-textfield>
    <svelte:fragment slot="after">
        <slot name="after" />
    </svelte:fragment>
</SpTextFieldWrapper>
