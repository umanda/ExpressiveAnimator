<script lang="ts">
    import {CurrentProject, CurrentCanvasZoom, CanvasEngineState} from "../../Stores";
    import SpNumberField from "../../Controls/SpNumberField.svelte";

    const {showRuler, showGrid, showGridToBack, showGuides, lockGuides, snapping} = CanvasEngineState;

    function changeZoom(value: number) {
        const engine = $CurrentProject?.engine;
        if (!engine) {
            return;
        }

        if (value === 0) {
            const bounds = engine?.project?.document?.localBounds;
            if (!bounds) {
                return;
            }
            engine.viewBox.zoomFit(bounds, engine.boundingBox, 20);
        } else {
            engine.viewBox.zoomByCoefficient(engine.boundingBox.middle, value / engine.viewBox.zoom);
        }
    }

    function onZoomItemClick(e: MouseEvent) {
        if ((e.target as HTMLElement).tagName.toLowerCase() !== 'sp-menu-item') {
            return;
        }
        changeZoom(parseFloat((e.target as any).value));
        dispatchClose(e.target as HTMLElement);
    }

    function toggleSnapping() {
        $snapping.enabled = !$snapping.enabled;
    }

    function toggleSnapGuides(e: Event) {
        $snapping.guides = !$snapping.guides;
        dispatchClose(e.target as HTMLElement);
    }

    function toggleSnapGrid(e: Event) {
        $snapping.grid = !$snapping.grid;
        dispatchClose(e.target as HTMLElement);
    }

    function toggleSnapPixel(e: Event) {
        $snapping.pixel = !$snapping.pixel;
        dispatchClose(e.target as HTMLElement);
    }

    function toggleSnapPoints(e: Event) {
        $snapping.points = !$snapping.points;
        dispatchClose(e.target as HTMLElement);
    }

    function toggleSnapBounds(e: Event) {
        $snapping.bounds = !$snapping.bounds;
        dispatchClose(e.target as HTMLElement);
    }

    function toggleSnapContours(e: Event) {
        $snapping.contours = !$snapping.contours;
        dispatchClose(e.target as HTMLElement);
    }

    function toggleRulerGrid() {
        $showRuler  = !$showRuler;
    }

    function toggleRuler(e: Event) {
        $showRuler = !$showRuler;
        dispatchClose(e.target as HTMLElement);
    }

    function toggleGrid(e: Event) {
        $showGrid = !$showGrid;
        dispatchClose(e.target as HTMLElement);
    }

    function toggleBackGrid(e: Event) {
        $showGridToBack = !$showGridToBack;
        dispatchClose(e.target as HTMLElement);
    }

    function toggleGuides(e: Event) {
        $showGuides = !$showGuides;
        dispatchClose(e.target as HTMLElement);
    }

    function toggleGuidesLock(e: Event) {
        $lockGuides = !$lockGuides;
        dispatchClose(e.target as HTMLElement);
    }

    function dispatchClose(el: HTMLElement) {
        el.dispatchEvent(new Event('close', {bubbles: true, composed: true}))
    }
</script>
<div class="canvas-options">
    <sp-action-group compact emphasized>
        <sp-action-button title="Snapping" size="s" selected={$snapping.enabled} on:click={toggleSnapping}>
            <sp-icon name="expr:snap" slot="icon" />
        </sp-action-button>
        <overlay-trigger type="modal" placement="bottom-end" offset="0">
            <sp-action-button slot="trigger" size="s">
                <sp-icon name="workflow:ChevronDown" slot="icon"></sp-icon>
            </sp-action-button>
            <sp-popover slot="click-content">
                <sp-menu>
                    <sp-menu-group>
                        <span slot="header">Snap to...</span>
                        <sp-menu-item selected={$snapping.guides} on:click={toggleSnapGuides}>Guides</sp-menu-item>
<!--                        <sp-menu-item selected={$snapping.grid} on:click={toggleSnapGrid}>Grid</sp-menu-item>-->
<!--                        <sp-menu-item selected={$snapping.pixel} on:click={toggleSnapPixel}>Pixel</sp-menu-item>-->
<!--                        <sp-menu-item selected={$snapping.points} on:click={toggleSnapPoints}>Points</sp-menu-item>-->
                        <sp-menu-item selected={$snapping.bounds} on:click={toggleSnapBounds}>Bounds</sp-menu-item>
<!--                        <sp-menu-item selected={$snapping.contours} on:click={toggleSnapContours}>Path</sp-menu-item>-->
                    </sp-menu-group>
                </sp-menu>
            </sp-popover>
        </overlay-trigger>
    </sp-action-group>
    <sp-action-group compact emphasized>
        <sp-action-button title="Ruler & Grid" size="s" selected={$showRuler} on:click={toggleRulerGrid}>
            <sp-icon name="expr:rulergrid" slot="icon" />
        </sp-action-button>
        <overlay-trigger type="modal" placement="bottom-end" offset="0">
            <sp-action-button slot="trigger" size="s">
                <sp-icon name="workflow:ChevronDown" slot="icon"></sp-icon>
            </sp-action-button>
            <sp-popover slot="click-content">
                <sp-menu style="min-width: var(--spectrum-global-dimension-size-1600)">
                    <sp-menu-item selected={$showRuler} on:click={toggleRuler}>View ruler</sp-menu-item>
                    <sp-menu-group>
                        <span slot="header">Grid</span>
                        <sp-menu-item selected={$showGrid} on:click={toggleGrid}>View grid</sp-menu-item>
                        <sp-menu-item selected={!$showGridToBack} on:click={toggleBackGrid}>Front grid</sp-menu-item>
                    </sp-menu-group>
                    <sp-menu-group>
                        <span slot="header">Guides</span>
                        <sp-menu-item selected={$showGuides} on:click={toggleGuides}>View guides</sp-menu-item>
                        <sp-menu-item selected={$lockGuides} on:click={toggleGuidesLock}>Lock guides</sp-menu-item>
                    </sp-menu-group>
                </sp-menu>
            </sp-popover>
        </overlay-trigger>
    </sp-action-group>
    <sp-action-group compact>
        <SpNumberField class="has-after" size="s"
                       format="percent" value={$CurrentCanvasZoom}
                       on:input={e => changeZoom(e.detail)}
                       style="--textfield-width: var(--spectrum-global-dimension-size-800); z-index: 1;"
        />
        <overlay-trigger type="modal" placement="bottom-end" offset="0">
            <sp-action-button slot="trigger" size="s">
                <sp-icon name="workflow:ChevronDown" slot="icon"></sp-icon>
            </sp-action-button>
            <sp-popover slot="click-content">
                <sp-menu on:click={onZoomItemClick}>
                    <sp-menu-item value="0">Fit</sp-menu-item>
                    <sp-menu-divider></sp-menu-divider>
                    <sp-menu-item value="0.25">25%</sp-menu-item>
                    <sp-menu-item value="0.5">50%</sp-menu-item>
                    <sp-menu-item value="0.75">75%</sp-menu-item>
                    <sp-menu-item value="1">100%</sp-menu-item>
                    <sp-menu-item value="2">200%</sp-menu-item>
                    <sp-menu-item value="4">400%</sp-menu-item>
                </sp-menu>
            </sp-popover>
        </overlay-trigger>
    </sp-action-group>
</div>
<style>
    .canvas-options {
        flex: 1;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-end;
        gap: var(--spectrum-alias-item-padding-s);
        padding-right: var(--spectrum-global-dimension-size-25);
        padding-left: var(--spectrum-global-dimension-size-25);
    }
</style>