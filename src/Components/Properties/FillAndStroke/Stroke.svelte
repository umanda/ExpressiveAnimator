<script lang="ts">
    import {StrokeLineCap, StrokeLineJoin, parseNumberList} from "@zindex/canvas-engine";
    import {formatNumber, getNumberFormatOptions} from "../../../Controls/utils";
    import PropertyGroup from "../PropertyGroup.svelte";
    import PropertyItem from "../PropertyItem.svelte";
    import SpTextField from "../../../Controls/SpTextField.svelte";
    import SpSlider from "../../../Controls/SpSlider.svelte";
    import IconSwitch from "../../../Controls/IconSwitch.svelte";
    import SpNumberField from "../../../Controls/SpNumberField.svelte";
    import IconToggle from "../IconToggle.svelte";
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    export let value: {
        strokeLineWidth: number,
        strokeLineCap: StrokeLineCap,
        strokeLineJoin: StrokeLineJoin,
        strokeMiterLimit: number,
        strokeDashArray: number[],
        strokeDashOffset: number,
        readonly pathLength?: number,
    };

    export let dashesPercent: boolean = false;
    export let unit: string = null;
    export let readonly: boolean = false;

    let isDashesPercent: boolean;
    $: isDashesPercent = dashesPercent && (value.pathLength != null);

    let dashValueScale: number;
    $: {
        if (isDashesPercent) {
            dashValueScale = 100 / value.pathLength;
        } else {
            dashValueScale = getNumberFormatOptions(unit).mul || 1;
        }
    }

    function formatDashArray(value: number[], scale: number, percent: boolean = false) {
        if (!value || value.length === 0) {
            return '';
        }

        return value
            .map(v => formatNumber((v < 0 ? -v: v) * scale, 4))
            .join(percent ? '%, ' : ', ') + (percent ? '%' : '');
    }

    function formatPathLength(value: number, unit: string): string {
        if (value == null) {
            return '-';
        }
        value *= (getNumberFormatOptions(unit)?.mul || 1)
        value = Math.round(value * 10000) / 10000;
        return value + (unit === 'px' ? '' : ' ' + unit);
    }

    function onDashArrayChange(e) {
        dispatch('update', {property: 'strokeDashArray', value: parseNumberList(e.detail, 1 / dashValueScale)});
    }

    function onLineCapChange(e) {
        dispatch('update', {property: 'strokeLineCap', value: parseInt(e.detail)});
    }

    function onLineJoinChange(e) {
        dispatch('update', {property: 'strokeLineJoin', value: parseInt(e.detail)});
    }

    const lineCapItems = [
        {
            value: StrokeLineCap.Butt,
            title: 'Butt',
            icon: 'expr:cap-butt'
        },
        {
            value: StrokeLineCap.Square,
            title: 'Square',
            icon: 'expr:cap-square'
        },
        {
            value: StrokeLineCap.Round,
            title: 'Round',
            icon: 'expr:cap-round'
        },
    ];
    const lineJoinItems = [
        {
            value: StrokeLineJoin.Miter,
            title: 'Miter',
            icon: 'expr:join-miter'
        },
        {
            value: StrokeLineJoin.Bevel,
            title: 'Bevel',
            icon: 'expr:join-bevel'
        },
        {
            value: StrokeLineJoin.Round,
            title: 'Round',
            icon: 'expr:join-round'
        },
    ];
</script>
<PropertyGroup title="Stroke">
    <SpSlider
            on:end
            on:input={e => dispatch('update', {property: 'strokeLineWidth', value: e.detail})}
            on:start={() => dispatch('start', {property: 'strokeLineWidth', value: value.strokeLineWidth})}
            label="Width" value={value.strokeLineWidth}
            readonly={readonly}
            allowOverflow={true} min={0} max={100} variant="ramp" format="{unit}" editable />
    <PropertyItem title="Line cap">
        <div style="flex: 1"></div>
        <IconSwitch on:change={onLineCapChange} size="s" value={value.strokeLineCap} items={lineCapItems} readonly={readonly} />
    </PropertyItem>
    <PropertyItem title="Line join">
        <SpNumberField
                on:input={e => dispatch('update', {property: 'strokeMiterLimit', value: e.detail})}
                on:start={() => dispatch('start', {property: 'strokeMiterLimit', value: value.strokeMiterLimit})}
                on:end
                label="miter limit"
                quiet={true}
                readonly={readonly}
                disabled={value.strokeLineJoin !== StrokeLineJoin.Miter}
                value={value.strokeMiterLimit}
                size="s"
                min={1} max={1000} />
        <IconSwitch on:change={onLineJoinChange} size="s" value={value.strokeLineJoin} items={lineJoinItems} readonly={readonly} />
    </PropertyItem>
    <PropertyItem title="Dashes">
        <SpTextField placeholder="dash, gap, ..."
                     label="array"
                     size="s"
                     quiet={true}
                     readonly={readonly}
                     on:change={onDashArrayChange}
                     value={formatDashArray(value.strokeDashArray, dashValueScale, isDashesPercent)} />
        <SpNumberField
                label="offset"
                size="s"
                quiet={true}
                style="--textfield-width: var(--spectrum-global-dimension-size-750);"
                readonly={readonly}
                on:input={e => dispatch('update', {property: 'strokeDashOffset', value: e.detail})}
                on:start={() => dispatch('start', {property: 'strokeDashOffset', value: value.strokeDashOffset})}
                on:end
                decimals={4}
                scale={isDashesPercent ? 1 / value.pathLength : 1}
                format={isDashesPercent ? "percent" : unit}
                value={value.strokeDashOffset}
        />
        <IconToggle title="Use percents" disabled={value.pathLength == null} bind:value={dashesPercent} small checkedIcon="expr:percent" uncheckedIcon="expr:percent" />
    </PropertyItem>
    <PropertyItem title="Path length">
        <div class="path-length">{formatPathLength(value.pathLength, unit)}</div>
    </PropertyItem>
</PropertyGroup>
<style>
    .path-length {
        flex: 1;
        text-align: right;
        user-select: text;
        padding-top: var(--spectrum-global-dimension-size-50);
        font-size: var(--spectrum-global-dimension-font-size-75);
    }
</style>