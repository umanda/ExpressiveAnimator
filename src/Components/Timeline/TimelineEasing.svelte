<script lang="ts">
    export let start: number = 0;
    export let end: number | null = null;
    export let title: string = '';
    export let selected: boolean = false;

    let min, max;

    $: {
        if (end != null && start > end) {
            min = end;
            max = start;
        } else {
            min = start;
            max = end;
        }
        if (min < 0) {
            min = 0;
        }
        if (max < 0) {
            max = 0;
        }
    }
</script>
{#if end != null}
<div on:pointerdown
     class="timeline-easing" class:is-selected={selected}
     style={`--timeline-keyframe-easing-start: ${min}; --timeline-keyframe-easing-end: ${max}`}>{title}</div>
{/if}
<style global>
    .timeline-easing {
        /*--timeline-keyframe-easing-start: 0;*/
        /*--timeline-keyframe-easing-end: 0;*/
        z-index: 1;
        position: absolute;
        left: 0;
        transform: translateX(calc(var(--timeline-keyframe-size) / 2 + var(--timeline-keyframe-easing-start) * var(--timeline-ms-unit)));
        width: calc((var(--timeline-keyframe-easing-end) - var(--timeline-keyframe-easing-start)) * var(--timeline-ms-unit));
        height: var(--timeline-keyframe-size);
        font-size: var(--spectrum-global-dimension-font-size-25);

        text-overflow: clip;
        overflow: hidden;
        white-space: nowrap;
        text-indent: calc(var(--timeline-keyframe-size) / 2);

        display: flex;
        justify-content: center;
        align-items: center;

        background: var(--spectrum-global-color-gray-400);
        color: var(--spectrum-global-color-gray-800);
    }
    .timeline-easing.is-selected {
        background: var(--spectrum-global-color-static-blue-200);
        color: var(--spectrum-global-color-gray-100);
    }

    sp-theme[color="light"] .timeline-easing {
        color: var(--spectrum-global-color-gray-900);
    }
    sp-theme[color="light"] .timeline-easing.is-selected {
        color: var(--spectrum-global-color-gray-50);
    }
</style>