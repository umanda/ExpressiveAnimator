<script lang="ts">
    import Logo from "../Logo.svelte";

    export let isWorking: boolean = false;
    export let action = undefined;

    export let version: number = 0;

    function getVersion(version: number) {
        const items = [];

        for (let i = 0; i < 3; i++) {
            items.unshift((version % 100).toString());
            version = Math.floor(version / 100);
        }

        return items.join('.');
    }
</script>
<div style="display: flex; flex-direction: column; justify-content: space-between; height: 160px; padding: var(--spectrum-global-dimension-size-50)">
    <div style="display: flex; justify-content: space-between; align-items: center">
        <Logo large/>
        <sp-field-label>version {getVersion(version)} (beta)</sp-field-label>
    </div>
    <div style="text-align: center">Copyright &copy; 2021 - <sp-link target="_blank" quiet href="https://zindex.software">Zindex Software</sp-link></div>

    <sp-button-group>
        <sp-button variant="secondary" href="https://github.com/ExpressiveSuite/ExpressiveAnimator" target="_blank">GitHub</sp-button>
        <sp-button variant="secondary" href="https://twitter.com/ExpressiveTools" target="_blank">Twitter</sp-button>
        <div style="flex: 1"></div>
        <sp-button variant="cta" href="https://github.com/sponsors/ExpressiveSuite" target="_blank">Sponsor this App</sp-button>
    </sp-button-group>
</div>