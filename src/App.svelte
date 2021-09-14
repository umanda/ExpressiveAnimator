<script lang="ts">
    import ToolsComponent from "./Components/Tools";
    import CanvasComponent from "./Components/Canvas.svelte";
    import TimelineComponent from "./Components/Timeline";
    import LogoComponent from "./Components/Logo.svelte";
    import ProjectStateComponent from "./Components/MenuBar/ProjectState.svelte";
    import AlignSelectionComponent from "./Components/MenuBar/AlignSelection.svelte";
    import TreeComponent from "./Components/Tree.svelte";
    import PropertiesComponent from "./Components/Properties";
    import SpSplitView from "./Controls/SpSplitView.svelte";

    import {CurrentTheme, CurrentProject, IsPlaying, AppSettings} from "./Stores";
    import DialogManager from "./Components/DialogManager.svelte";
    import type {DialogDef, OpenDialogFunction} from "./actions";
    import {onMount} from "svelte";
    import type {SvelteComponent} from "svelte";
    import SettingsBar from "./Components/SettingsBar.svelte";
    import CanvasOptions from "./Components/MenuBar/CanvasOptions.svelte";
    import ToolOptions from "./Components/MenuBar/ToolOptions.svelte";
    import {setHotKeysContext} from "./hotkeys";
    import ContextMenu from "./Components/ContextMenu.svelte";
    import {globalMenu, canvasContextMenu, timelineContextMenu} from "./context-menu";
    import {isEventOnInput, showNewProjectDialog} from "./actions";
    import {AnimationProject} from "./Core";
    import type {Toast} from "@spectrum-web-components/toast";
    import LoadingDialog from "./Components/Dialogs/LoadingDialog.svelte";
    import SaveDialog from "./Components/Dialogs/SaveDialog.svelte";
    import NewProjectDialog from "./Components/Dialogs/NewProjectDialog.svelte";
    import AboutDialog from "./Components/Dialogs/AboutDialog.svelte";
    import ExportDialog from "./Components/Dialogs/ExportDialog.svelte";

    function noCtxMenu(e: Event & {target: HTMLElement}) {
        if (!$IsPlaying && e.target != null && isEventOnInput(e)) {
            return;
        }
        e.preventDefault();
        return false;
    }

    function saveLayoutSize(property: string, size: number) {
        const obj = AppSettings.settings.layout;
        if (obj[property] === size) {
            return;
        }
        obj[property] = size;
        AppSettings.save();
    }

    function useGlobalKeysContext() {
        setHotKeysContext('all');
    }

    function useCanvasKeysContext() {
        setHotKeysContext('canvas');
    }

    function useTimelineKeysContext() {
        setHotKeysContext('timeline');
    }

    let hidden = false;
    let openDialog: OpenDialogFunction;
    let contextMenuPosition = null;
    let contextMenuItems = null;

    function showContextMenu(e: PointerEvent, items: any[]) {
        e.preventDefault();
        e.stopPropagation();
        if ($CurrentProject.middleware.toolIsWorking) {
            return;
        }
        contextMenuPosition = {x: e.clientX, y: e.clientY};
        contextMenuItems = items;
    }

    function closeContextMenu() {
        contextMenuPosition = null;
        contextMenuItems = null;
    }

    function onCanvasContextMenu(e: PointerEvent) {
        showContextMenu(e, canvasContextMenu);
    }

    function onTimelineContextMenu(e: PointerEvent) {
        showContextMenu(e, timelineContextMenu);
    }

    function onMenuItemAction(e: CustomEvent<{action: (project: AnimationProject) => any}>) {
        if (e.detail.action) {
            e.detail.action($CurrentProject);
        }
    }

    let toastElement: Toast;

    function onToast(e: CustomEvent<{message: string, variant?: string, timeout?: number}>) {
        //toastElement.stopCountdown();
        toastElement.variant = (e.detail.variant as any) || "";
        toastElement.timeout = e.detail.timeout || 6000;
        toastElement.innerText = e.detail.message;
        toastElement.open = true;
        //toastElement.startCountdown();
    }

    const dialogMap = {
        'save': SaveDialog,
        'loading': LoadingDialog,
        'new-project': NewProjectDialog,
        'about': AboutDialog,
        'export': ExportDialog,
    }

    function onDialog(e: CustomEvent<{component: SvelteComponent | string, dialog: DialogDef, properties?: object}>) {
        let component = typeof e.detail.component === 'string' ? dialogMap[e.detail.component] : e.detail.component;
        if (!component) {
            return;
        }
        openDialog(e.detail.dialog, component, e.detail.properties);
    }

    onMount(() => {
        window.addEventListener('wheel', function (event: WheelEvent) {
            if (event.ctrlKey && event.deltaY !== 0 && event.deltaX === 0 && event.deltaZ === 0) {
                // do not zoom with wheel
                event.preventDefault();
            }
        }, {passive: false});
        setTimeout(() => {
            const project = $CurrentProject;
            if (project) {
                project.engine.viewBox.zoomFit(project.document.localBounds, project.engine.updateBoundingBox());
            }
            showNewProjectDialog(project);
            window.dispatchEvent(new Event('expressive-animator-ready'));
        }, 600);
    });
</script>
<svelte:window
        on:contextmenu={noCtxMenu}
        on:expressive-toast={onToast}
        on:expressive-dialog={onDialog}
/>
<sp-icons-medium></sp-icons-medium>
<sp-icons-workflow></sp-icons-workflow>
<sp-icons-expr></sp-icons-expr>
<sp-theme scale="medium" color={$CurrentTheme} class="app" on:sp-closed={closeContextMenu}>
    <div on:focusin={useGlobalKeysContext} class="app-logo">
        <LogoComponent />
    </div>
    <div on:focusin={useGlobalKeysContext} class="app-menubar">
        <ProjectStateComponent on:action={onMenuItemAction} menu={globalMenu} readonly={$IsPlaying} />
        <div class="app-menubar-middle">
            <ToolOptions readonly={$IsPlaying} />
            <CanvasOptions />
        </div>
        <AlignSelectionComponent readonly={$IsPlaying} />
    </div>
    <div class="app-toolbar">
        <ToolsComponent readonly={$IsPlaying} disabled={$CurrentProject == null} />
        <SettingsBar disabled={$IsPlaying} />
    </div>
    <SpSplitView class="app-sidebar" resizable vertical
                 primary-min="160"
                 primary-size="{AppSettings.settings.layout.propertiesSizePercent}%"
                 on:resized={e => saveLayoutSize('propertiesSizePercent', e.detail)}
    >
        <svelte:fragment slot="primary">
            <PropertiesComponent on:focusin={useGlobalKeysContext} />
        </svelte:fragment>
        <svelte:fragment slot="secondary" let:collapsed>
            <TreeComponent on:focusin={useCanvasKeysContext} collapsed={collapsed} />
        </svelte:fragment>
    </SpSplitView>
    <SpSplitView class="app-content" resizable vertical
                 secondary-min="0"
                 secondary-max="600"
                 primary-size="{AppSettings.settings.layout.canvasSizePercent}%"
                 on:resized={e => saveLayoutSize('canvasSizePercent', e.detail)}
    >
        <svelte:fragment slot="primary">
            <CanvasComponent on:contextmenu={onCanvasContextMenu} on:focus={useCanvasKeysContext} hidden={hidden}>Now canvas is hidden and this is the fallback content</CanvasComponent>
        </svelte:fragment>
        <svelte:fragment slot="secondary" let:collapsed>
            <TimelineComponent on:contextmenu={onTimelineContextMenu} on:focusin={useTimelineKeysContext} on:pointerdown={useTimelineKeysContext} collapsed={collapsed} />
        </svelte:fragment>
    </SpSplitView>
    <DialogManager bind:openDialog />
    {#if $CurrentProject != null}
        <ContextMenu on:action={onMenuItemAction} position={contextMenuPosition} items={contextMenuItems} on:close={closeContextMenu} />
    {/if}
    <div class="toast" role="region">
        <sp-toast bind:this={toastElement}></sp-toast>
    </div>
</sp-theme>
<style global>
    .app {
        display: grid;
        grid-gap: 0;
        margin: 0;
        padding: 0;
        box-sizing: border-box;

        background: var(--spectrum-global-color-gray-100);
        color: var(--spectrum-global-color-gray-800);

        width: 100%;
        height: 100%;

        grid-template-areas:
                'logo menubar menubar'
                'toolbar content sidebar'
        ;
        grid-template-rows: 48px auto;
        grid-template-columns: 48px auto 260px;

        --separator-color: var(--spectrum-global-color-gray-300);

        --scrollbar-width: 6px;
        --scrollbar-radius: 0px;
        --scrollbar-color: var(--spectrum-global-color-gray-500);

        --spectrum-dragbar-handle-background-color: var(--separator-color);
        --spectrum-dragbar-handle-background-color-hover: var(--separator-color);

        --spectrum-global-font-family-base: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, 'Trebuchet MS', 'Lucida Grande', sans-serif;
        --spectrum-global-font-family-serif: 'Source Serif Pro', Georgia, serif;
        --spectrum-global-font-family-code: 'Source Code Pro', Monaco, monospace;
        --spectrum-alias-body-text-font-family: var(--spectrum-global-font-family-base);
    }

    .app[color="dark"] {
        --separator-color: var(--spectrum-global-color-gray-50);
    }

    .app div {
        box-sizing: border-box;
    }

    .app-logo {
        grid-area: logo;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        user-select: none;
    }

    .app-menubar {
        grid-area: menubar;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        user-select: none;
    }

    .app-menubar-middle {
        flex: 1;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-end;
        gap: var(--spectrum-alias-item-padding-s);
        padding-right: var(--spectrum-global-dimension-size-25);
        padding-left: var(--spectrum-global-dimension-size-25);
    }

    .app-toolbar {
        grid-area: toolbar;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        user-select: none;
        border-top: var(--spectrum-global-dimension-static-size-25) solid var(--separator-color);
    }

    .app-sidebar {
        grid-area: sidebar;
        user-select: none;
        box-sizing: border-box;
        border-top: var(--spectrum-global-dimension-static-size-25) solid var(--separator-color);
    }

    .app-content {
        box-sizing: border-box;

        grid-area: content;
        border: var(--spectrum-global-dimension-static-size-25) solid var(--separator-color);
        border-bottom: none;
    }

    .toast {
        width: 100vw;
        text-align: center;
        position: fixed;
        bottom: 0;
        display: flex;
        flex-direction: column;
        z-index: 10;
    }

    .toast sp-toast {
        margin: 0 auto var(--spectrum-global-dimension-size-300);
    }
</style>