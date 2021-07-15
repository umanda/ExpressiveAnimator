<script lang="ts">
    import type {Element, AxisPointPosition, PointStruct} from "@zindex/canvas-engine";
    import type {AnimationProject} from "../../Core";
    import {Point, Orientation} from "@zindex/canvas-engine";
    import NumberPair from "./NumberPair.svelte";
    import PropertyGroup from "./PropertyGroup.svelte";
    import SidePosition from "./SidePosition.svelte";
    import PropertyItem from "./PropertyItem.svelte";
    import PropertyAction from "./PropertyAction.svelte";
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    export let element: Element;
    export let proportionalScale: boolean = false;
    export let readonly: boolean = false;
    export let unit: string = undefined;

    function alignAnchor(project: AnimationProject, element: Element, value: AxisPointPosition) {
        return project.middleware.alignElementToOrigin(element, value.x, value.y);
    }

    function alignOrigin(project: AnimationProject, element: Element, value: AxisPointPosition) {
        return project.middleware.alignOriginToElement(element, value.x, value.y);
    }

    function doFlip(project: AnimationProject, element: Element, value: PointStruct) {
        return project.middleware.setElementProperty(element, 'scale', element.scale.mul(value));
    }

    function onStart(property: string) {
        dispatch('start', {property, value: element[property]});
    }

    function onUpdate(property: string, value: any) {
        dispatch('update', {property, value});
    }

    let currentSkew: 'skewAngle' | 'skewAxis' = 'skewAngle';

    const xy = {
        x: {label: 'x', format: unit},
        y: {label: 'y', format: unit},
    };

    // update unit
    $: xy.x.format = xy.y.format = unit;

    const properties = {
        position: xy,
        anchor: xy,
        rotate: {
            x: {label: 'angle', format: 'deg', decimals: 0},
            y: {label: 'turns', format: 'decimal', decimals: 0, step: 1},
        },
        scale: {
            x: {label: 'x', format: 'percent'},
            y: {label: 'y', format: 'percent'},
        },
        skew: {
            x: {label: 'angle', format: 'deg', min: -85, max: 85},
            y: {label: 'axis', format: 'deg'},
        },
    }

    let disabled: boolean;
    $: disabled = element == null;

</script>
<PropertyGroup title="Transform">
    <PropertyItem title="Position" disabled={disabled}>
        <NumberPair on:end
                    on:start={() => onStart('position')}
                    on:input={e => onUpdate('position', Point.fromObject(e.detail))}
                    properties={properties.position}
                    disabled={disabled}
                    readonly={readonly}
                    value={element?.position}
        >
            <SidePosition
                    on:input={e => dispatch('action', {action: alignOrigin, value: e.detail})}
                    disabled={disabled || readonly}
                    icon="expr:center-origin-object" />
        </NumberPair>
    </PropertyItem>
    <PropertyItem title="Anchor" disabled={disabled}>
        <NumberPair on:end
                    on:start={() => onStart('anchor')}
                    on:input={e => onUpdate('anchor', Point.fromObject(e.detail))}
                    disabled={disabled}
                    readonly={readonly}
                    properties={properties.anchor}
                    value={element?.anchor}
        >
            <SidePosition
                    disabled={disabled || readonly}
                    on:input={e => dispatch('action', {action: alignAnchor, value: e.detail})}
                    icon="expr:center-object-origin" />
        </NumberPair>
    </PropertyItem>
    <PropertyItem title="Rotate" disabled={disabled}>
        <NumberPair on:end
                    on:start={() => onStart('rotate')}
                    on:input={e => onUpdate('rotate', e.detail.x + e.detail.y * 360)}
                    disabled={disabled}
                    readonly={readonly}
                    properties={properties.rotate}
                    value={element ? {x: element.rotate % 360, y: Math.trunc(element.rotate / 360)} : null}
        >
            <sp-action-button
                    disabled={disabled || readonly}
                    title="Auto rotate"
                    on:click={() => onUpdate('orientation', element.orientation === Orientation.None ? Orientation.Auto : Orientation.None)}
                    size="s" emphasized quiet selected={element && (element.orientation !== Orientation.None)}>
                <sp-icon slot="icon" name='expr:rotate' size="s"></sp-icon>
            </sp-action-button>
        </NumberPair>
    </PropertyItem>
    <PropertyItem title="Scale" disabled={disabled}>
        <NumberPair on:end
                    on:start={() => onStart('scale')}
                    on:input={e => onUpdate('scale', Point.fromObject(e.detail))}
                    disabled={disabled}
                    readonly={readonly}
                    proportions={proportionalScale}
                    showProportionsIcon
                    properties={properties.scale}
                    value={element?.scale}
        />
    </PropertyItem>
    <PropertyItem title="Skew" disabled={disabled}>
        <NumberPair on:end
                    on:start={e => {currentSkew = e.detail === 'x' ? 'skewAngle' : 'skewAxis'; onStart(currentSkew)}}
                    on:input={e => onUpdate(currentSkew, currentSkew === 'skewAngle' ? e.detail.x : e.detail.y)}
                    disabled={disabled}
                    readonly={readonly}
                    properties={properties.skew}
                    value={element ? {x: element.skewAngle, y: element.skewAxis} : null}>
        </NumberPair>
    </PropertyItem>
    <PropertyItem title="Flip" disabled={disabled}>
        <div style="display: flex; flex: 1; flex-direction: row; justify-content: space-evenly">
            <sp-action-button quiet title="Flip horizontal" size="s" disabled={disabled || readonly}
                              on:click={() => dispatch('action', {action: doFlip, type: 'flip', value: {x: -1, y: 1}})}>
                <sp-icon name="workflow:FlipHorizontal" slot="icon"></sp-icon>
            </sp-action-button>
            <div style="width: var(--spectrum-global-dimension-size-100)"></div>
            <sp-action-button quiet title="Flip vertical" size="s" disabled={disabled || readonly}
                              on:click={() => dispatch('action', {action: doFlip, type: 'flip', value: {x: 1, y: -1}})}>
                <sp-icon name="workflow:FlipVertical" slot="icon"></sp-icon>
            </sp-action-button>
        </div>
        <PropertyAction />
    </PropertyItem>
</PropertyGroup>