<script context="module" lang="ts">
    const ONE_PIXEL = new Image();
    ONE_PIXEL.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
</script>
<script lang="ts">
    import "@spectrum-css/treeview/dist/index-vars.css";
    import {MoveElementMode, MouseButton} from "@zindex/canvas-engine";
    import type {Element, Document, Selection} from "@zindex/canvas-engine";
    import {createEventDispatcher} from "svelte";
    import SpTreeViewItem from "./SpTreeViewItem.svelte";

    const dispatch = createEventDispatcher();

    export let document: Document = null;
    export let selection: Selection<Document>;
    export let reverse: boolean = false;
    export let readonly: boolean = false;
    export let infoMap: {
        [key: string]: {
            icon: string,
            title: string,
        }
    } = null;

    function onTitle(e: MouseEvent) {
        if (readonly) {
            return;
        }
        const id = (e.target as HTMLElement).getAttribute('data-element-id');
        if (!id) {
            return;
        }

        const element = document?.getElementById(id);
        if (!element) {
            return;
        }

        dispatch('title', element);
    }

    function onLock(e: CustomEvent<Element>) {
        if (readonly) {
            return;
        }
        dispatch('lock', e.detail);
    }

    function onHide(e: CustomEvent<Element>) {
        if (readonly) {
            return;
        }
        dispatch('hide', e.detail);
    }

    let dragging: boolean = false;
    let moveMode: MoveElementMode = null;
    let moveTarget: string = null;

    function onPointerDown(e: PointerEvent) {
        if (readonly || e.button !== MouseButton.Left) {
            return;
        }

        const id = (e.target as HTMLElement).getAttribute('data-element-id');
        if (!id) {
            return;
        }

        const element = document?.getElementById(id);
        if (!element) {
            return;
        }

        if (e.shiftKey) {
            if (selection.toggle(element, true)) {
                dispatch('selection');
            }
        } else if (e.altKey && !selection.isEmpty) {
            if (selection.rangeSelect(selection.activeElement, element)) {
                dispatch('selection');
            }
        } else {
            if (selection.isSelected(element)) {
                if (selection.activeElement !== element) {
                    selection.activeElement = element;
                    dispatch('selection');
                }
            } else if (selection.select(element, false)) {
                dispatch('selection');
            }
        }
    }

    async function onDragStart(e: DragEvent) {
        if (readonly || !selection || selection.isEmpty) {
            e.preventDefault();
            return;
        }

        e.stopPropagation();

        e.dataTransfer.setData('expressive.animator.private', '\0');
        e.dataTransfer.setDragImage(ONE_PIXEL, 0, 0);
        e.dataTransfer.effectAllowed = "move";

        setTimeout(() => dragging = true, 20);
    }

    async function onDragOver(e: DragEvent) {
        const id = (e.target as HTMLElement).getAttribute('data-element-id');
        if (!id) {
            return;
        }

        const target = document?.getElementById(id);
        if (!target) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";

        moveTarget = id;
        moveMode = getMode(e, target, reverse);

        return false;
    }

    async function onDragEnd(e: DragEvent) {
        if (!dragging || !moveTarget) {
            dragging = false;
            moveTarget = null;
            moveMode = null;
            return;
        }

        e.preventDefault();

        if (e.dataTransfer.dropEffect === "move") {
            const target = document?.getElementById(moveTarget);

            // this is a correct drop
            let mode = moveMode;
            if (reverse) {
                if (mode === MoveElementMode.BEFORE) {
                    mode = MoveElementMode.AFTER;
                } else if (mode === MoveElementMode.AFTER) {
                    mode = MoveElementMode.BEFORE;
                }
            }

            dispatch('drop', {
                element: selection.activeElement,
                target,
                mode,
                selection: selection
            });
        }

        dragging = false;
        moveTarget = null;
        moveMode = null;
    }

    function onDragLeave() {
        moveTarget = null;
    }

    function getMode(e: DragEvent, element: Element, reverse: boolean): MoveElementMode {
        const box = (e.target as HTMLElement).getBoundingClientRect();
        const top = (e.clientY - box.top) / box.height;

        const isFirst = (reverse ? element.nextSibling : element.previousSibling) == null;

        if (element.supportsChildren) {
            if (isFirst && top < 0.25) {
                return MoveElementMode.BEFORE;
            }
            if (top < 0.5 || (e.target as HTMLElement).classList.contains('is-open')) {
                return MoveElementMode.APPEND;
            }
            return MoveElementMode.AFTER;
        }

        if (isFirst && top < 0.5) {
            return MoveElementMode.BEFORE;
        }

        return MoveElementMode.AFTER;
    }

    let children: Element[];
    $: children = Array.from(document.children(reverse));
</script>
{#if document != null}
    <ul class="spectrum-TreeView" class:is-dragged={dragging} on:dragstart={onDragStart}>
        {#each children as child (child.id)}
            <SpTreeViewItem
                    on:hide={onHide}
                    on:lock={onLock}
                    on:dblclick={onTitle}
                    on:pointerdown={onPointerDown}
                    on:dragend={onDragEnd}
                    on:dragleave={onDragLeave}
                    on:dragover={onDragOver}
                    element={child}
                    selection={selection}
                    reverse={reverse}
                    dragging={dragging}
                    moveMode={moveMode}
                    moveTarget="{moveTarget}"
                    infoMap={infoMap}
            />
        {/each}
    </ul>
{/if}
<style global>
    .spectrum-TreeView {
        touch-action: none;
        margin: var(--spectrum-global-dimension-size-100) 0;
    }
    .spectrum-TreeView.is-dragged {
        --spectrum-treeview-item-background-color-hover: transparent;
    }
</style>