<script lang="ts">
    import NumberPair from "./NumberPair.svelte";
    import type {AxisPointPosition, PointStruct, Rectangle} from "@zindex/canvas-engine";
    import {Point} from "@zindex/canvas-engine";
    import SidePosition from "./SidePosition.svelte";
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    export let value: Point;
    export let readonly: boolean = false;
    export let bounds: Rectangle = null;
    export let absolute: boolean = true;

    const absProps = {
        x: {label: 'x', format: 'decimal'},
        y: {label: 'y', format: 'decimal'},
    };
    const relProps = {
        x: {label: 'x', format: 'percent'},
        y: {label: 'y', format: 'percent'},
    };

    let properties = absProps;
    let computedValue: Point;

    $: {
        if (absolute || bounds == null) {
            computedValue = value;
            properties = absProps;
        } else {
            computedValue = bounds.getRelativePoint(value.x, value.y);
            properties = relProps;
        }
    }

    function onStart() {
        dispatch('start', value);
    }

    function onSide(e: CustomEvent<AxisPointPosition>) {
        const point = bounds.getPointAtPosition(e.detail.x, e.detail.y, false, value);
        if (point.equals(value)) {
            return;
        }
        dispatch('start', value);
        dispatch('update', point);
        dispatch('end');
    }

    function onUpdate(e: CustomEvent<PointStruct>) {
        if (absolute || bounds == null) {
            dispatch('update', Point.fromObject(e.detail));
        } else {
            dispatch('update', bounds.getAbsolutePoint(e.detail.x, e.detail.y));
        }
    }
</script>
<NumberPair on:start={onStart} on:input={onUpdate} on:end readonly={readonly} properties={properties} value={computedValue}>
    <SidePosition disabled={readonly || bounds == null} on:input={onSide} icon="expr:center-object-origin" />
</NumberPair>