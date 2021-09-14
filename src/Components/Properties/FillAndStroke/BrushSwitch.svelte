<script lang="ts">
    import SpSlider from "../../../Controls/SpSlider.svelte";
    import {BrushType, Point, Rectangle, VectorElement} from "@zindex/canvas-engine";
    import type {
        Brush,
        SolidBrush,
        StopColor,
        GradientBrush,
        ConicalGradientBrush,
        LinearGradientBrush,
        RadialGradientBrush,
        TwoPointGradientBrush,
    } from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";
    import {AnimationProject} from "../../../Core";

    const dispatch = createEventDispatcher();

    export let value: {
        fill: Brush,
        fillOpacity: number,
        strokeBrush: Brush,
        strokeOpacity: number,
    };

    export let showFill: boolean = true;
    export let readonly: boolean = false;

    let opacityProperty: string;
    $: opacityProperty = showFill ? 'fillOpacity' : 'strokeOpacity';

    function toSvgStopColor(stop: StopColor): string {
        return `<stop offset="${Math.round(stop.offset * 100)}%" stop-color="${stop.color.rgba}" />`;
    }

    function getBackgroundPicture(value: Brush): string {
        switch (value.type) {
            case BrushType.None:
                return 'linear-gradient(-45deg, transparent 0%, transparent 47.5%, #f00 47.5%, #f00 52.5%, transparent 52.5%, transparent 100%)';
            case BrushType.Solid:
                return (value as SolidBrush).color.toString();
            case BrushType.LinearGradient:
                const angle = (value as LinearGradientBrush).start.getPositiveAngleTo((value as LinearGradientBrush).end) + 90;
                return `linear-gradient(${angle}deg, ${(value as GradientBrush).stopColors.toString()})`;
            case BrushType.RadialGradient:
                return `radial-gradient(${(value as GradientBrush).stopColors.toString()})`;
            case BrushType.TwoPointGradient:

                let gradient = value as TwoPointGradientBrush;

                let cr = 0, fx = 0, fy = 0, fr = 0;

                const p = gradient.start.sub(gradient.end);
                const size = 2 * Math.max(gradient.startRadius, gradient.endRadius, Math.abs(p.x), Math.abs(p.y)) / 100;

                if (size !== 0) {
                    cr = gradient.endRadius / size;
                    fx = p.x / size;
                    fy = p.y / size;
                    fr = gradient.startRadius / size;
                }

                const str = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<radialGradient id="gradient" cx="50%" cy="50%" r="${cr}%" fx="${50 + fx}%" fy="${50 + fy}%" fr="${fr}%">
${gradient.stopColors.list.map(toSvgStopColor).join('')}
</radialGradient>
<rect width="100%" height="100%" fill="url(#gradient)" />
</svg>`;

                return `url("data:image/svg+xml;base64,${window.btoa(str)}")`;
            case BrushType.ConicalGradient:
                const conic = value as ConicalGradientBrush;
                if (conic.startAngle === 0 && conic.endAngle === 360) {
                    return `conic-gradient(from 90deg, ${(value as GradientBrush).stopColors.toString()})`;
                }
                const prepend = conic.startAngle > 0
                    ? `${conic.stopColors.list[0].color.rgba} 0deg ${conic.startAngle}deg, `
                    : '';
                const append = conic.endAngle < 360
                    ? `, ${conic.stopColors.list[conic.stopColors.list.length - 1].color.rgba} ${conic.endAngle}deg 360deg`
                    : '';
                const diff = conic.endAngle - conic.startAngle;
                return `conic-gradient(from 90deg, ${prepend}${conic.stopColors.list.map(s => `${s.color.rgba} ${conic.startAngle + s.offset * diff}deg`)}${append})`;
            case BrushType.Pattern:
                return 'repeating-linear-gradient(transparent, #808080 20%), repeating-linear-gradient(90deg, #fff, #000 20%)';
            default:
                return 'transparent';
        }
    }

    const bgCache = {
        fill: {
            value: null,
            picture: null
        },
        strokeBrush: {
            value: null,
            picture: null
        }
    }

    function getBackground(brush: Brush, opacity: number, cache: {value: Brush, picture: string | null}): string {
        let picture: string;

        if (brush === cache.value && cache.picture != null) {
            picture = cache.picture;
        } else {
            cache.value = brush;
            picture = cache.picture = getBackgroundPicture(brush);
        }

        // this is a trick to also set opacity
        // the background property sets style="background: $picture"
        return `${picture}; opacity: ${opacity};`;
    }

    function swap(project: AnimationProject, element: VectorElement, keepOpacity: boolean): boolean {
        if (!(element instanceof VectorElement)) {
            return false;
        }
        return project.middleware.swapStrokeFill([element], keepOpacity);
    }

    function copyStroke(project: AnimationProject, element: VectorElement, copyOpacity: boolean): boolean {
        if (!(element instanceof VectorElement)) {
            return false;
        }
        return project.middleware.copyStrokeToFill([element], copyOpacity);
    }

    function copyFill(project: AnimationProject, element: VectorElement, copyOpacity: boolean): boolean {
        if (!(element instanceof VectorElement)) {
            return false;
        }
        return project.middleware.copyFillToStroke([element], copyOpacity);
    }

    function onCopy(e: MouseEvent) {
        if (readonly) {
            return;
        }
        dispatch('action', {
            action: showFill ? copyStroke : copyFill,
            type: showFill ? 'copyStrokeToFill' : 'copyFillToStroke',
            value: e.altKey,
        });
    }

    function onSwap(e: MouseEvent) {
        if (readonly) {
            return;
        }
        dispatch('action', {
            action: swap,
            type: 'swapStrokeFill',
            value: e.altKey
        });
    }
</script>
<div class="brush-switch">
    <div class="thumbnail-wrapper">
        <sp-thumbnail title="Fill" background="{getBackground(value.fill, value.fillOpacity, bgCache.fill)}"
                      selected={showFill ? '' : undefined} on:click={() => showFill = true} class="fill"></sp-thumbnail>
        <sp-thumbnail title="Stroke" background="{getBackground(value.strokeBrush, value.strokeOpacity, bgCache.strokeBrush)}"
                      selected={!showFill ? '' : undefined} on:click={() => showFill = false}
                      class="stroke"></sp-thumbnail>
        <div class="action-icon"
             on:click={onCopy} title="{showFill ? 'Copy Stroke' : 'Copy Fill'}" style="bottom: 0; left: 0">
            <sp-icon name="{showFill ? 'expr:swap-arrow-up-left' : 'expr:swap-arrow-down-right'}" size="s"></sp-icon>
        </div>
        <div class="action-icon"
             on:click={onSwap} title="Swap Fill & Stroke" style="top: 0; right: 0">
            <sp-icon name="expr:swap-arrows" size="s"></sp-icon>
        </div>
    </div>
    <SpSlider label={showFill ? 'Fill opacity' : 'Stroke opacity'}
              value={value[opacityProperty]}
              readonly={readonly}
              style="flex: 1"
              min={0} max={1} step={0.01}
              format="percent" variant="filled" editable
              on:end
              on:input={e => dispatch('update', {property: opacityProperty, value: e.detail})}
              on:start={() => dispatch('start', {property: opacityProperty, value: value[opacityProperty]})}
    />
</div>

<style>
    .action-icon {
        display: inline-block;
        cursor: pointer;
        width: var(--spectrum-global-dimension-size-200);
        height: var(--spectrum-global-dimension-size-200);
    }

    .brush-switch {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--spectrum-global-dimension-size-75);
    }

    .thumbnail-wrapper {
        position: relative;
        width: var(--spectrum-global-dimension-size-600);
        height: var(--spectrum-global-dimension-size-600);
    }

    .thumbnail-wrapper > * {
        position: absolute;
    }

    sp-icon {
        cursor: pointer;
    }

    sp-thumbnail {
        --spectrum-thumbnail-border-color: var(--spectrum-global-color-gray-400);
        --spectrum-thumbnail-border-color-selected: var(--spectrum-thumbnail-border-color);
        --spectrum-thumbnail-border-size-selected: var(--spectrum-alias-border-size-thin);
    }

    sp-thumbnail.fill {
        top: 0;
        left: 0;
        clip-path: polygon(-5% -5%, -5% 105%, 50% 105%, 50% 50%, 105% 50%, 105% -5%);
    }

    sp-thumbnail[selected].fill {
        z-index: 1;
        clip-path: none;
    }

    sp-thumbnail.stroke {
        bottom: 0;
        right: 0;
        clip-path: polygon(-5% -5%, -5% 105%, 30% 105%, 30% 30%, 70% 30%, 70% 70%, 30% 70%, 30% 105%, 105% 105%, 105% -5%);
    }

    sp-thumbnail > div {
        width: 100%;
        height: 100%;
    }
</style>
