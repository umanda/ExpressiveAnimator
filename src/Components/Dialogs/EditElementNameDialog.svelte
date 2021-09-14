<script lang="ts">
    import SpTextField from "../../Controls/SpTextField.svelte";
    export let value: string;
    export let isWorking: boolean = false;
    export let action = undefined;
</script>
<SpTextField style="width: 100%; --textfield-width: 100%; --textfield-text-align: left;" disabled={isWorking} bind:value={value} />