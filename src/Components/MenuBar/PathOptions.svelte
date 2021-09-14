<svelte:options immutable={true} />
<script lang="ts">
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    export let disabled: boolean = false;
    export let current: string = 'unite';
    export let selectedVectors: number = 0;
    export let selectedPaths: number = 0;

    const items = [
        {
            id: 'unite',
            title: 'Unite',
            icon: 'workflow:AddTo',
            minVectors: 2,
            minPaths: 0,
        },
        {
            id: 'subtract-back',
            title: 'Subtract Back',
            icon: 'workflow:SubtractBackPath',
            minVectors: 2,
            minPaths: 0,
        },
        {
            id: 'subtract-front',
            title: 'Subtract Front',
            icon: 'workflow:SubtractFrontPath',
            minVectors: 2,
            minPaths: 0,
        },
        {
            id: 'intersect',
            title: 'Intersect',
            icon: 'workflow:IntersectOverlap',
            minVectors: 2,
            minPaths: 0,
        },
        {
            id: 'exclude',
            title: 'Exclude',
            icon: 'workflow:ExcludeOverlap',
            minVectors: 2,
            minPaths: 0,
        },
        null,
        {
            id: 'merge',
            title: 'Merge',
            icon: 'expr:path-merge',
            minVectors: 2,
            minPaths: 0,
        },
        {
            id: 'split',
            title: 'Split',
            icon: 'expr:path-split',
            minVectors: 1,
            minPaths: 1,
        },
        {
            id: 'divide',
            title: 'Divide',
            icon: 'workflow:DividePath',
            minVectors: 1,
            minPaths: 0,
        },
        {
            id: 'outline',
            title: 'Outline',
            icon: 'workflow:OutlinePath',
            minVectors: 1,
            minPaths: 0,
        },
    ];

    function onOp(e: MouseEvent & {target: Element}) {
        const value = e.target.getAttribute('data-op');
        e.target.dispatchEvent(new Event('close', {bubbles: true, composed: true}));
        dispatch('input', {value, activeAsTarget: e.metaKey || e.ctrlKey, keepOriginal: e.altKey, reverse: e.shiftKey});
        current = value;
    }

    let first;
    $: first = items.find(item => item != null && item.id === current);
</script>
<sp-action-group compact>
    <sp-action-button on:click={onOp} data-op="{first.id}" title="{first.title}" disabled={disabled || (selectedVectors < first.minVectors || selectedPaths < first.minPaths)} size="s">
        <sp-icon size="s" name="{first.icon}" slot="icon"></sp-icon>
    </sp-action-button>
    <overlay-trigger type="modal" placement="bottom-end" offset="0">
        <sp-action-button slot="trigger" size="s" disabled={disabled || selectedVectors === 0}>
            <sp-icon name="workflow:ChevronDown" slot="icon"></sp-icon>
        </sp-action-button>
        <sp-popover slot="click-content">
            <sp-menu>
                {#each items as item}
                    {#if item == null}
                        <sp-menu-divider></sp-menu-divider>
                    {:else}
                        <sp-menu-item on:click={onOp} data-op="{item.id}" disabled={disabled || (selectedVectors < item.minVectors || selectedPaths < item.minPaths)}>
                            <sp-icon size="s" name="{item.icon}" slot="icon"></sp-icon>
                            {item.title}
                        </sp-menu-item>
                    {/if}
                {/each}
            </sp-menu>
        </sp-popover>
    </overlay-trigger>
</sp-action-group>
