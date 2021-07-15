<script lang="ts">
    import NumberPair from "../NumberPair.svelte";
    import PropertyItem from "../PropertyItem.svelte";
    import PropertyGroup from "../PropertyGroup.svelte";
    import type {AnimationProject} from "../../../Core";
    import type {Element, PointStruct} from "@zindex/canvas-engine";
    import {Point} from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    export let value: Element;
    export let unit: string = undefined;
    export let readonly: boolean = false;

    let properties = {
        position: {
            x: {label: 'x', format: 'decimal'},
            y: {label: 'y', format: 'decimal'},
        },
        size: {
            x: {label: 'width', format: 'decimal', min: 0},
            y: {label: 'height', format: 'decimal', min: 0},
        }
    };

    $: properties.size.x.format = properties.size.y.format =
       properties.position.x.format = properties.position.y.format = unit;

    let disabled: boolean = false;
    $: disabled = value == null;

    function moveElement(project: AnimationProject, element: Element, delta: Point): boolean {
        return project.middleware.moveElementBy(element, delta);
    }

    function moveAction(e: CustomEvent<PointStruct>) {
        return;
        const delta = new Point(e.detail.x - value.globalBounds.left, e.detail.y - value.globalBounds.top);
        if (!delta.isZero) {
            dispatch('action', {action: moveElement, value: delta});
        }
    }

    // TODO: finish coords

</script>
<PropertyGroup title="Global coordinates">
    <PropertyItem title="Position" disabled={disabled}>
        <NumberPair
                on:end={moveAction}
                readonly={readonly}
                disabled={disabled}
                properties={properties.position}
                value={value ? value.globalBounds.bounds : null} />
    </PropertyItem>
    <PropertyItem title="Size" disabled={disabled}>
        <NumberPair
                readonly={readonly}
                disabled={disabled}
                properties={properties.size}
                value={value ? {x: value.globalBounds.bounds.width, y: value.globalBounds.bounds.height} : null} />
    </PropertyItem>
</PropertyGroup>