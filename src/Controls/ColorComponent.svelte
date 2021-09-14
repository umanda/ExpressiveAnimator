<script lang="ts">
    import {Color} from "@zindex/canvas-engine";
    import {CurrentColorMode} from "../Stores";
    import ColorControl from "./ColorControl.svelte";
    import {TinyColor} from "@ctrl/tinycolor";
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    export let value: Color;
    export let readonly: boolean = false;

    let started: boolean = false;

    function onInput(e: CustomEvent<TinyColor>) {
        if (!started) {
            started = true;
            dispatch('start', value);
        }
        dispatch('update', new Color(e.detail.r, e.detail.g, e.detail.b, e.detail.a));
    }

    function onStart() {
        if (started) {
            return;
        }
        started = true;
        dispatch('start', value);
    }

    function onDone() {
        started = false;
        dispatch('end');
    }

</script>
<ColorControl value={new TinyColor(value)}
              on:start={onStart}
              on:end={onDone}
              bind:mode={$CurrentColorMode}
              on:input={onInput}
              readonly={readonly}
><slot /></ColorControl>