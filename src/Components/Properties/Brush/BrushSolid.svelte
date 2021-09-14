<script lang="ts">
    import {SolidBrush} from "@zindex/canvas-engine";
    import type {Color} from "@zindex/canvas-engine";
    import ColorComponent from "../../../Controls/ColorComponent.svelte";
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    export let value: SolidBrush;
    export let readonly: boolean = false;

    function onUpdate(e: CustomEvent<Color>) {
        dispatch('update', value.withColor(e.detail));
    }
</script>
<ColorComponent
        on:update={onUpdate}
        on:start
        on:end
        value={value.color} readonly={readonly} />