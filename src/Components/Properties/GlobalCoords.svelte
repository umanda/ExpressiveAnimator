<script lang="ts">
    import type {AnimationProject} from "../../Core";
    import type {AxisPointPosition, Element, PointStruct, Rectangle} from "@zindex/canvas-engine";
    import {Point, Position, RegularPolygonElement, StarElement} from "@zindex/canvas-engine";
    import PropertyGroup from "./PropertyGroup.svelte";
    import PropertyItem from "./PropertyItem.svelte";
    import NumberPair from "./NumberPair.svelte";
    import {createEventDispatcher} from "svelte";
    import SidePosition from "./SidePosition.svelte";
    import {notifyPropertiesChanged} from "../../Stores";

    const dispatch = createEventDispatcher();

    export let readonly: boolean = false;
    export let proportionalSize: boolean = false;
    export let element: Element;

    let canResize: boolean;
    $: canResize = element.isResizable && !((element instanceof StarElement) || (element instanceof RegularPolygonElement))

    const properties = {
        position: {
            x: {label: 'x', format: 'decimal'},
            y: {label: 'y', format: 'decimal'},
        },
        size: {
            x: {label: 'width', format: 'decimal', min: 0},
            y: {label: 'height', format: 'decimal', min: 0},
        }
    };

    function doSnapshot() {
        return true;
    }

    let changed: boolean = false;
    let start: Rectangle = null;

    function onStart() {
        start = element.globalBounds.bounds;
        changed = false;
    }

    function onPosition(e: CustomEvent<PointStruct>) {
        dispatch('action', (project: AnimationProject) => {
            if (project.middleware.moveElementsBy(project.selection, new Point(
                e.detail.x - element.globalBounds.left,
                e.detail.y - element.globalBounds.top
            ))) {
                changed = true;
                project.engine?.invalidate();
                notifyPropertiesChanged();
            }
            return false;
        });
    }

    function onPositionEnd() {
        if (changed || start.top !== element.globalBounds.left || start.top !== element.globalBounds.top) {
            dispatch('action', doSnapshot);
        }
        changed = false;
        start = null;
    }

    function onAlign(e: CustomEvent<AxisPointPosition>) {
        dispatch('action', (project: AnimationProject) => {
            return project.middleware.alignElementToRectangle(element, element.document.globalBounds.bounds, e.detail.x, e.detail.y);
        });
    }

    function onSize(e: CustomEvent<PointStruct>) {
        const delta = new Point(
            e.detail.x - element.globalBounds.width,
            e.detail.y - element.globalBounds.height,
        );
        dispatch('action', (project: AnimationProject) => {
            let resized: boolean = false;
            for (const element of project.selection) {
                const info = project.middleware.computeResizeInfo(element, delta.add(element.globalBounds.bottomRight), {x: Position.End, y: Position.End});
                if (info && project.middleware.resizeElementByMatrix(element, info.matrix, info.flip)) {
                    resized = true;
                }
            }
            if (resized) {
                changed = true;
                project.engine?.invalidate();
                notifyPropertiesChanged();
            }
            return false;
        });
    }

    function onSizeEnd() {
        if (changed || !start.equals(element.globalBounds.bounds)) {
            dispatch('action', doSnapshot);
        }
        changed = false;
        start = null;
    }
</script>
<PropertyGroup title="Global coordinates">
    <PropertyItem title="Position">
        <NumberPair
                on:start={onStart}
                on:input={onPosition}
                on:end={onPositionEnd}
                readonly={readonly}
                properties={properties.position}
                value={element.globalBounds.bounds}
        >
            <SidePosition
                    title="Align"
                    on:input={onAlign}
                    disabled={readonly}
                    icon="expr:center-origin-object" />
        </NumberPair>
    </PropertyItem>
    <PropertyItem title="Size" disabled={!canResize}>
        <NumberPair
                on:start={onStart}
                on:input={onSize}
                on:end={onSizeEnd}
                readonly={readonly}
                disabled={!canResize}
                properties={properties.size}
                value={{x: element.globalBounds.width, y: element.globalBounds.height}}
                bind:proportions={proportionalSize}
                showProportionsIcon
        />
    </PropertyItem>
</PropertyGroup>