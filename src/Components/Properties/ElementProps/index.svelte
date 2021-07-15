<script lang="ts">
    import Ellipse from "./Ellipse.svelte";
    import Rectangle from "./Rectangle.svelte";
    import RegularPolygon from "./RegularPolygon.svelte";
    import Star from "./Star.svelte";
    import Poly from "./Poly.svelte";
    import Line from "./Line.svelte";
    // import Coords from "./Coords.svelte";
    import {Element} from "@zindex/canvas-engine";

    export let value: object;
    export let type: string;
    export let readonly: boolean = false;
    export let unit: string = undefined;

    const map = {
        'rect': Rectangle,
        'ellipse': Ellipse,
        'regular-polygon': RegularPolygon,
        'star': Star,
        'poly': Poly,
        'line': Line,
    }

    let component = null;
    $: component = map[type] || null;

    // TODO: proportional size
</script>
<!--<Coords value={value instanceof Element ? value : null} unit={unit} readonly={readonly} />-->
{#if component}
    <svelte:component this={component}
                      value={value || {}} readonly={readonly}
                      unit={unit} type={type}
                      isGlobal={!(value instanceof Element)}
                      on:start on:end on:update on:action />
{/if}