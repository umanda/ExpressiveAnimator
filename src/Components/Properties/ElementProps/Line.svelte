<script lang="ts">
    import PropertyGroup from "../PropertyGroup.svelte";
    import PropertyItem from "../PropertyItem.svelte";
    import NumberPair from "../NumberPair.svelte";
    import {Point, PointStruct} from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";
    import {getTitle} from "./utils";

    const dispatch = createEventDispatcher();

    export let value: {
        points: [Point, Point]
    };
    export let type: string;
    export let isGlobal: boolean = false;
    export let readonly: boolean = false;
    export let unit: string = undefined;

    function onPointsStart() {
        dispatch('start', {property: 'points', type, value: value.points});
    }

    function onPointsUpdate(point: PointStruct, index: number) {
        const points = [...value.points];
        points[index] = Point.fromObject(point);
        dispatch('update', {property: 'points', type, value: points});
    }

    const xy = {
        x: {label: 'x', format: unit},
        y: {label: 'y', format: unit},
    };

    // update unit
    $: xy.x.format = xy.y.format = unit;
</script>
<PropertyGroup title="{getTitle('Line', isGlobal)}">
    <PropertyItem title="From" disabled={isGlobal}>
        <NumberPair on:end
                    on:start={onPointsStart}
                    on:input={e => onPointsUpdate(e.detail, 0)}
                    disabled={isGlobal}
                    readonly={readonly}
                    properties={xy}
                    value={value.points ? value.points[0] : null}
        />
    </PropertyItem>
    <PropertyItem title="To" disabled={isGlobal}>
        <NumberPair on:end
                    on:start={onPointsStart}
                    on:input={e => onPointsUpdate(e.detail, 1)}
                    disabled={isGlobal}
                    readonly={readonly}
                    properties={xy}
                    value={value.points ? value.points[1] : null}
        />
    </PropertyItem>
</PropertyGroup>