<svelte:options immutable={true} />
<script lang="ts">
    import {createEventDispatcher, onDestroy} from "svelte";
    import {blurOrCallback} from "./utils";
    const dispatch = createEventDispatcher();

    export let value: number = 0;
    export let small: boolean = false;

    export let vertical: boolean = false;
    export let invert: boolean = false;
    export let disabled: boolean = false;
    export let readonly: boolean = false;

    export let colorTemplate: string = 'rgba(0, 0, 0, %alpha)';

    let started: boolean = false;

    function onInput(e: InputEvent) {
        if (!started) {
            started = true;
            dispatch('start', value);
        }

        value = (e.target as {value: number}).value / 100;

        dispatch('update', value);
    }

    function onBlur() {
        if (started) {
            started = false;
            dispatch('end');
        }
    }

    function onPointerUp(e: PointerEvent) {
        if (started) {
            blurOrCallback(e.target as HTMLElement, onBlur);
        }
    }

    onDestroy(() => onBlur());
</script>
<sp-alpha-slider
        on:input={onInput}
        on:blur={onBlur}
        on:pointerup={onPointerUp}
        template={colorTemplate}
        vertical={vertical}
        invert={invert}
        value={value * 100}
        disabled={disabled}
        readonly={readonly}
        small={small ? '' : undefined}
        label="Alpha"
></sp-alpha-slider>