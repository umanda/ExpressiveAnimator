<script lang="ts">
    import {CurrentProject} from "../../Stores";
    import {CurrentCanvasZoom} from "../../Stores";
    import SpNumberField from "../../Controls/SpNumberField.svelte";

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
        e.target.dispatchEvent(new Event('close', {bubbles: true, composed: true}))
    }
</script>
<div class="canvas-options">
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
        padding-right: var(--spectrum-alias-item-padding-s);
    }
</style>