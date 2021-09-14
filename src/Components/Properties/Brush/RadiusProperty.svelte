<script lang="ts">
    import type {Rectangle} from "@zindex/canvas-engine";
    import NumberProperty from "../NumberProperty.svelte";
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    export let value: number;
    export let readonly: boolean = false;
    export let absolute: boolean = true;
    export let bounds: Rectangle = null;

    function onUpdate(e: CustomEvent<{value: number}>) {
        if (absolute || bounds == null) {
            dispatch('update', e.detail.value);
        } else {
            dispatch('update', bounds.getAbsoluteRadius(e.detail.value));
        }
    }
</script>
<NumberProperty
                min={0}
                on:start
                on:end
                on:update={onUpdate}
                value={absolute || bounds == null ? value : bounds.getRelativeRadius(value)}
                format={absolute || bounds == null ? "decimal" : "percent"}
                readonly={readonly} />