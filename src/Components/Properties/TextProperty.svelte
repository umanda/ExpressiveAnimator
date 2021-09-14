<script lang="ts">
    export let selectable: boolean = false;
    export let left: boolean = false;
</script>
<div class="text-property" class:text-left={left} class:selectable-text={selectable}><slot/></div>
<style>
    .text-property {
        flex: 1;
        text-align: right;
        padding-top: var(--spectrum-global-dimension-size-50);
        font-size: var(--spectrum-global-dimension-font-size-75);
    }
    .text-property.text-left {
        text-align: left;
    }
    .text-property.selectable-text {
        user-select: text;
    }
</style>