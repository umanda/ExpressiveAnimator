<script lang="ts">
    import PropertyGroup from "../PropertyGroup.svelte";
    import PropertyItem from "../PropertyItem.svelte";
    import NumberProperty from "../NumberProperty.svelte";
    import PropertyAction from "../PropertyAction.svelte";
    import SpNumberField from "../../../Controls/SpNumberField.svelte";
    import {AnimationProject} from "../../../Core";
    import {RectElement, RectShapeRadius} from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";
    import {getTitle} from "./utils";

    const dispatch = createEventDispatcher();

    export let value: {
        width?: number,
        height?: number,
        radius?: RectShapeRadius
    };
    export let type: string;
    export let isGlobal: boolean = false;

    export let readonly: boolean = false;
    export let unit: string = undefined;

    function dispatchRadiusStart() {
        dispatch('start', {property: 'radius', type, value: value.radius})
    }

    function createRectRadius(itemValue: number, index: number): RectShapeRadius {
        const radius = (value.radius.value as number[]).slice();
        radius[index] = itemValue;
        return new RectShapeRadius(radius);
    }

    function setRectRadiusType(project: AnimationProject, element: RectElement, split: boolean) {
        if (!(element instanceof RectElement) || element.radius == null || element.radius.isSimple !== split) {
            return false;
        }

        return project.middleware.setElementProperty(element, "radius", split ? element.radius.split() : element.radius.join());
    }

    const radiusItems = [["top-left", 0], ["top-right", 1], ["bottom-left", 3], ["bottom-right", 2]];

    let isMultiRadius: boolean;
    $: isMultiRadius = value.radius != null && !value.radius.isSimple;
</script>
<PropertyGroup title="{getTitle('Rectangle', isGlobal)}">
    <PropertyItem title="Size" disabled={isGlobal}>
        <NumberProperty
                label="width" value={value.width} property="width" type="{type}"
                min={0}
                format={unit} disabled={isGlobal} readonly={readonly}
                on:end on:update on:start />
        <NumberProperty
                label="height" value={value.height} property="height" type="{type}"
                min={0}
                format={unit} disabled={isGlobal} readonly={readonly}
                on:end on:update on:start />
        <PropertyAction />
    </PropertyItem>
    <PropertyItem title="Radius" disabled={value.radius == null}>
        {#if !isMultiRadius}
            <SpNumberField
                    label="all corners"
                    quiet={true} size="s"
                    min={0} format={unit} readonly={readonly}
                    value={value.radius?.value || 0}
                    on:end
                    on:input={e => dispatch('update', {property: 'radius', type, value: new RectShapeRadius(e.detail)})}
                    on:start={dispatchRadiusStart}
            />
            <div style="flex: 1"></div>
        {:else}
            <div class="rect-radius-controls">
                {#each radiusItems as item}
                    <SpNumberField
                            label="{item[0]}"
                            quiet={true} size="s"
                            min={0} format={unit} readonly={readonly}
                            value={value.radius.value[item[1]]}
                            on:end
                            on:input={e => dispatch('update', {property: 'radius', type, value: createRectRadius(e.detail, item[1])})}
                            on:start={dispatchRadiusStart}
                    />
                {/each}
            </div>
        {/if}
        <PropertyAction>
            <sp-action-button
                    title="{isMultiRadius ? 'Join' : 'Split'}"
                    size="s"
                    quiet
                    class="very-small"
                    disabled={readonly}
                    on:click={() => dispatch('action', {action: setRectRadiusType, type: 'setRectRadiusType', value: !isMultiRadius})}
            >
                <sp-icon slot="icon" name="{isMultiRadius ? 'expr:radius-same' : 'expr:radius-separate'}"></sp-icon>
            </sp-action-button>
        </PropertyAction>
    </PropertyItem>
</PropertyGroup>
<style>
    .rect-radius-controls {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--property-group-gap, var(--spectrum-global-dimension-size-100));
    }
</style>