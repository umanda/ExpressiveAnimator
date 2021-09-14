<script lang="ts">
    import Logo from "../Logo.svelte";
    import SpTextField from "../../Controls/SpTextField.svelte";
    import SpNumberField from "../../Controls/SpNumberField.svelte";
    import SpTextFieldWrapper from "../../Controls/SpTextFieldWrapper.svelte";
    import {openRecentProject, openProject, createNewProject, showToast} from "../../actions";

    export let isWorking: boolean = false;
    export let action: (func: (value?: any) => Promise<boolean | void>) => Promise<void>;

    export let pwa: boolean = true;
    export let recent: {title: string, handle: FileSystemFileHandle}[] = null;
    export let deferPrompt: Event = null;

    let title: string = 'New project';
    let width: number = 640;
    let height: number = 480;
    let duration: number = 3000;
    let size: string = '-';

    const sizes = [
        {
            id: 'small',
            title: 'Small',
            width: 320,
            height: 240,
        },
        {
            id: 'medium',
            title: 'Medium',
            width: 640,
            height: 480,
        },
        {
            id: 'large',
            title: 'Large',
            width: 1280,
            height: 720,
        },
        {
            id: 'fhd',
            title: 'Full HD',
            width: 1920,
            height: 1080,
        }
    ];

    async function onPWAInstall() {
        if (deferPrompt == null) {
            await action(async () => true);
            showToast('Could not install as PWA', 'error');
            return;
        }

        (deferPrompt as any).prompt();
        const {outcome} = (deferPrompt as any).userChoice;
        pwa = outcome === 'dismissed';
    }

    function onSizeChange(e) {
        size = e.target.value;
        const item = sizes.find(v => v.id === size);
        if (item) {
            width = item.width;
            height = item.height;
        }
    }

    async function onCreateProject() {
        if (isWorking) {
            return;
        }
        const data = {
            title: title.trim() || 'Main',
            width,
            height,
            duration,
        };
        await action(async () => {
            await createNewProject(data);
        });
    }

    async function onOpen() {
        if (isWorking) {
            return;
        }
        await action(async () => {
            if (!(await openProject())) {
                return false;
            }
        });
    }

    async function onImport() {
        if (isWorking) {
            return;
        }
    }

    async function openRecent(handle: FileSystemFileHandle) {
        if (isWorking) {
            return;
        }
        await action(async () => {
            try {
                if (!(await openRecentProject(handle))) {
                    return false;
                }
            } catch (e) {
                return false;
            }

            return true;
        });
    }
</script>
<div class="wrapper">
    <div class="left-side">
        <Logo large />
        {#if pwa}
            <sp-button size="l" variant="cta" on:click={onPWAInstall}>
                <sp-icon size="l" name="workflow:AssetsDownloaded" slot="icon"></sp-icon>
                Install as PWA
            </sp-button>
        {/if}
        <sp-sidenav class="scroll scroll-no-padding" hidden-x>
            {#if recent != null && recent.length > 0}
                <sp-sidenav-heading label="Recent projects">
                    {#each recent as item}
                        {#if item.handle && item.handle.kind === 'file'}
                            <sp-sidenav-item label="{item.title || item.handle.name}" on:click={() => openRecent(item.handle)}>
                                <small>({item.handle.name})</small>
                            </sp-sidenav-item>
                        {/if}
                    {/each}
                </sp-sidenav-heading>
            {/if}
        </sp-sidenav>
        <sp-button-group>
            <sp-button on:click={onOpen} variant="secondary">Open</sp-button>
<!--            <sp-button on:click={onImport} variant="secondary">Import...</sp-button>-->
        </sp-button-group>
    </div>
    <sp-divider vertical style="margin: 0 var(--spectrum-global-dimension-size-200)"></sp-divider>
    <div style="flex: 1">
        <h2>Create new project</h2>
        <div style="display: flex; flex-direction: column; flex: 1; gap: var(--spectrum-global-dimension-size-200)">
            <div style="display: flex; gap: var(--spectrum-global-dimension-size-100)">
                <SpTextField bind:value={title} readonly={isWorking} label="Project name" labelPosition="above" style="--textfield-text-align: left"/>
                <SpNumberField bind:value={duration} readonly={isWorking} format="ms" min={0} step={100} max={1000000} decimals={0} label="Duration" labelPosition="above" />
            </div>
            <SpTextFieldWrapper label="Size" labelPosition="above">
                <sp-picker value="{size}" class="textfield-input" on:change={onSizeChange} readonly={isWorking}>
                    <sp-menu-item value="-">Custom</sp-menu-item>
                    <sp-menu-divider></sp-menu-divider>
                    {#each sizes as item (item.id)}
                        <sp-menu-item value="{item.id}">{item.title} ({item.width}&times;{item.height})</sp-menu-item>
                    {/each}
                </sp-picker>
            </SpTextFieldWrapper>
            <div style="display: flex; gap: var(--spectrum-global-dimension-size-100)">
                <SpNumberField bind:value={width} min={1} decimals={0} label="Width" labelPosition="above" disabled={size !== '-'} readonly={isWorking} />
                <SpNumberField bind:value={height} min={1} decimals={0} label="Height" labelPosition="above" disabled={size !== '-'} readonly={isWorking} />
            </div>
        </div>
        <sp-button on:click={onCreateProject} variant="primary" style="margin-left: auto">Create Project</sp-button>
    </div>
</div>
<style>
    .wrapper {
        display: flex;
        height: 400px;
        user-select: none;
        padding: var(--spectrum-global-dimension-size-50);
        padding-top: 0;
    }

    .wrapper > div {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: var(--spectrum-global-dimension-size-200);
    }

    .wrapper > .left-side {
        width: var(--spectrum-global-dimension-size-3000);
    }

    .wrapper sp-sidenav {
        flex: 1;
        --scrollbar-width: 6px;
        --spectrum-sidenav-heading-gap-top: 0;
    }

    .wrapper h2 {
        margin: 0;
        text-transform: uppercase;
        text-align: center;
    }

    .wrapper sp-sidenav-item > small {
        margin-left: auto;
        font-style: italic;
    }
</style>
