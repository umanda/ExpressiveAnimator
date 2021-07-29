<script lang="ts">
    import type {MenuItemDef} from "./utils";
    import Shortcut from "./Shortcut.svelte";
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    export let items: (MenuItemDef | null)[];
    export let open: boolean = false;
    export let level: number = 0;

    let popover;

    function onAction(item: MenuItemDef) {
        if (!item.disabled && !item.children) {
            dispatch('action', item);
            if (level === 0) {
                popover.dispatchEvent(new Event('close', {
                    bubbles: true,
                    composed: true
                }));
            }
        }
    }

    function onActionEvent(e: CustomEvent<MenuItemDef>) {
        onAction(e.detail);
    }
</script>
<sp-popover {...$$restProps} open={open} class="cascade-menu-popover" bind:this={popover}>
    <sp-menu class="cascade-menu">
        {#each items as item}
            {#if item == null}
                <sp-menu-divider></sp-menu-divider>
            {:else}
                <sp-menu-item disabled={item.disabled} on:click={() => onAction(item)}>
                    {item.title}
                    {#if item.children}
                        <sp-icon slot="value" disabled={item.disabled} name="workflow:ChevronRight"></sp-icon>
                    {:else if item.shortcut}
                        <kbd slot="value">
                            <Shortcut value={item.shortcut} />
                        </kbd>
                    {/if}
                    {#if !item.disabled && item.children}
                        <svelte:self on:action={onActionEvent} items={item.children} open={true} level={level + 1} />
                    {/if}
                </sp-menu-item>
            {/if}
        {/each}
    </sp-menu>
</sp-popover>
<style global>
    .cascade-menu-popover {
        z-index: 5;
        overflow: visible;
        clip-path: none !important;
    }

    .cascade-menu {
        overflow: visible;
        min-width: 180px;
    }

    .cascade-menu sp-menu-item > sp-popover.cascade-menu-popover {
        display: none;
        position: absolute;
        top: 0;
        left: 80%;
    }

    .cascade-menu sp-menu-item:hover > sp-popover {
        display: block;
    }
</style>