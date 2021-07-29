<svelte:options immutable={true} />
<script lang="ts">
    import {mergeClasses} from "./utils";

    export let label: string = undefined;
    export let labelPosition: 'start' | 'center' | 'end' = 'center';
    export let id: string = undefined;
    export let disabled: boolean = false;
    export let size: 's' | 'm' | 'l' | 'xl' = 'm';
    export let wrap: boolean = false;

    let computedClass;
    $: computedClass = mergeClasses({
        'textfield-wrapper': true,
        'textfield-label-': labelPosition,
    }, $$props.class);
</script>
<div {...$$restProps} class="{computedClass}">
    {#if wrap && ($$slots.before || $$slots.after)}
        <div class="textfield-wrapper-group">
            <slot name="before"/>
            <slot/>
            <slot name="after"/>
        </div>
    {:else}
        <slot/>
    {/if}
    {#if label != null}
        <sp-field-label for="{id}" size="{size}" disabled={disabled}>{label}</sp-field-label>
    {/if}
</div>
<style global>
    .textfield-wrapper {
        width: fit-content;
        display: inline-flex;
        align-items: center;
        gap: 0;
    }

    .textfield-wrapper > .textfield-wrapper-group {
        display: inline-flex;
        gap: 0;
        width: 100%;
        /* TODO: finish wrapper */
    }

    .textfield-wrapper.textfield-label-center {
        flex-direction: column;
    }

    .textfield-wrapper.textfield-label-start {
        flex-direction: row-reverse;
        gap: var(--textfield-label-gap, var(--spectrum-global-dimension-size-100));
    }

    .textfield-wrapper.textfield-label-end {
        flex-direction: row;
        gap: var(--textfield-label-gap, var(--spectrum-global-dimension-size-100));
    }

    .textfield-wrapper .textfield-input:focus-within {
        z-index: 1;
    }

    .textfield-wrapper .textfield-input {
        width: var(--textfield-width, auto);
    }

    .textfield-wrapper.has-after sp-number-field.textfield-input:not([quiet]) {
        --spectrum-alias-border-radius-regular: var(--spectrum-global-dimension-size-50) 0 0 var(--spectrum-global-dimension-size-50);
    }

    .textfield-wrapper.flex-input {
        width: 100%;
    }

    .textfield-wrapper.flex-input .textfield-input {
        flex: 1;
    }

    .textfield-wrapper.has-after .textfield-input:not([quiet]) {
        --spectrum-textfield-m-border-radius: var(--spectrum-alias-border-radius-regular) 0 0 var(--spectrum-alias-border-radius-regular);
    }

    .textfield-wrapper.has-after sp-picker:not([quiet]) {
        margin-left: -1px;
        --spectrum-picker-s-border-radius: 0 var(--spectrum-alias-border-radius-regular) var(--spectrum-alias-border-radius-regular) 0;
        --spectrum-picker-m-border-radius: 0 var(--spectrum-alias-border-radius-regular) var(--spectrum-alias-border-radius-regular) 0;
        --spectrum-picker-l-border-radius: 0 var(--spectrum-alias-border-radius-regular) var(--spectrum-alias-border-radius-regular) 0;
        --spectrum-picker-xl-border-radius: 0 var(--spectrum-alias-border-radius-regular) var(--spectrum-alias-border-radius-regular) 0;
    }

    .textfield-wrapper.has-before .textfield-input:not([quiet]) {
        --spectrum-textfield-m-border-radius: 0 var(--spectrum-alias-border-radius-regular) var(--spectrum-alias-border-radius-regular) 0;
    }

    .textfield-wrapper.has-before sp-picker:not([quiet]) {
        --spectrum-picker-s-border-radius: var(--spectrum-alias-border-radius-regular) 0 0 var(--spectrum-alias-border-radius-regular);
        --spectrum-picker-m-border-radius: var(--spectrum-alias-border-radius-regular) 0 0 var(--spectrum-alias-border-radius-regular);
        --spectrum-picker-l-border-radius: var(--spectrum-alias-border-radius-regular) 0 0 var(--spectrum-alias-border-radius-regular);
        --spectrum-picker-xl-border-radius: var(--spectrum-alias-border-radius-regular) 0 0 var(--spectrum-alias-border-radius-regular);
    }

    .textfield-input[quiet] {
        /* fix border radius when quiet */
        --spectrum-alias-border-radius-regular: 0;
    }

    .textfield-input[size="s"] {
        --spectrum-textfield-m-text-size: var(--spectrum-alias-item-text-size-s);
        --spectrum-textfield-m-height: var(--spectrum-alias-item-height-s);
        --spectrum-textfield-m-padding-left: var(--spectrum-alias-item-padding-s);
        --spectrum-textfield-m-padding-right: var(--spectrum-alias-item-padding-s);
        --spectrum-textfield-m-min-width: var(--spectrum-global-dimension-size-450);
    }

    .textfield-input[size="l"] {
        --spectrum-textfield-m-text-size: var(--spectrum-alias-item-text-size-l);
        --spectrum-textfield-m-height: var(--spectrum-alias-item-height-l);
        --spectrum-textfield-m-padding-left: var(--spectrum-alias-item-padding-l);
        --spectrum-textfield-m-padding-right: var(--spectrum-alias-item-padding-l);
        --spectrum-textfield-m-min-width: var(--spectrum-global-dimension-size-750);
    }

    .textfield-input[size="xl"] {
        --spectrum-textfield-m-text-size: var(--spectrum-alias-item-text-size-xl);
        --spectrum-textfield-m-height: var(--spectrum-alias-item-height-xl);
        --spectrum-textfield-m-padding-left: var(--spectrum-alias-item-padding-xl);
        --spectrum-textfield-m-padding-right: var(--spectrum-alias-item-padding-xl);
        --spectrum-textfield-m-min-width: var(--spectrum-global-dimension-size-900);
    }
</style>