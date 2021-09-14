<script lang="ts">
    import {Overlay, VirtualTrigger} from "@spectrum-web-components/overlay";
    import CascadeMenu from "./CascadeMenu/index.svelte";
    import type {PointStruct} from "@zindex/canvas-engine";
    import {onDestroy} from "svelte";

    export let position: PointStruct;
    export let items: any[];

    let content: HTMLElement & {open: boolean} = undefined;

    let close: () => void = null;

    async function open() {
        if (content.open) {
            return;
        }

        content.open = true;
        const closeOverlay = await Overlay.open(content.parentElement, 'modal', content, {
            placement: 'auto-end',
            offset: 0,
            virtualTrigger: new VirtualTrigger(position.x, position.y),
        });
        close = () => {
            close = null;
            closeOverlay();
            if (content && content.open) {
                content.open = false;
            }
        };
    }

    $: if (position && content) open();
    onDestroy(() => close && close());
</script>
{#if position != null && items != null}
    <CascadeMenu bind:popover={content} on:action items={items} />
{/if}