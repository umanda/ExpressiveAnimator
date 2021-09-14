<script lang="ts">
    export let value: string = '';
    export let isWorking: boolean = false;
    export let action = undefined;
</script>
<sp-progress-bar size="s" label="{value}" style="width: 100%" indeterminate></sp-progress-bar>