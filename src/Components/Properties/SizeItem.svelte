<script lang="ts">
    import {PointStruct} from "@zindex/canvas-engine";
    import NumberPair from "./NumberPair.svelte";
    import IconToggle from "./IconToggle.svelte";

    type SizeStruct = { width: number, height: number };

    export let proportionalSize: boolean = false;
    export let value: SizeStruct;
    export let label: string = 'Size';

    function sizeToPoint(size: SizeStruct): PointStruct {
        return {x: size.width, y: size.height};
    }

    function onSizeDone() {
        // TODO;
    }

    const properties = {
        x: {label: 'width'},
        y: {label: 'height'}
    };
</script>
<NumberPair on:end={onSizeDone}
            on:start={() => size = value.board}
            on:input={e => size = {width: e.detail.x, height: e.detail.y}}
            proportions={proportionalSize}
            label="{label}"
            properties={properties}
            value={sizeToPoint(value)}>
    <IconToggle title="Keep proportions" bind:value={proportionalSize} />
</NumberPair>