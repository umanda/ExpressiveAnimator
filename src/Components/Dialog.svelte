<script lang="ts">
    import type {DialogDef} from "../actions";
    import {Overlay} from '@spectrum-web-components/overlay';
    import {createEventDispatcher, onMount} from "svelte";

    const dispatch = createEventDispatcher();

    export let data: DialogDef;

    let isWorking: boolean = false;
    let error: string = null;
    let onClose: () => void;

    async function onAction(action: (value?: any) => Promise<boolean | void>) {
        if (isWorking) {
            return;
        }

        error = null;

        if (action) {
            isWorking = true;
            try {
                if ((await action(data.value)) === false) {
                    return;
                }
            } catch (e: Error) {
                error = e.message;
                return;
            } finally {
                isWorking = false;
            }
        }

        if (onClose) {
            onClose();
        }
    }

    async function onCancel() {
        await onAction(data.cancel?.action);
    }

    async function onConfirm() {
        await onAction(data.confirm?.action);
    }

    async function onSecondary() {
        await onAction(data.secondary?.action);
    }

    let content: HTMLElement & {open: boolean} = undefined;

    async function open() {
        if (content.open) {
            return;
        }
        content.open = true;
        const closeDialog = await Overlay.open(content.parentElement, 'modal', content, {
            placement: 'none',
            receivesFocus: data.autofocus !== false ? 'auto' : undefined,
        });
        onClose = () => {
            if (!content) {
                return;
            }
            closeDialog();
            content.open = false;
        };
        if (data.abort) {
            setTimeout(() => data.abort().then(onCancel), 0);
        }
        return onClose;
    }

    function onCloseCallback() {
        if (data.close) {
            data.close();
        }
        dispatch('close');
    }

    onMount(async () => {
       content['overlayCloseCallback'] = onCloseCallback;
       return await open();
    });
</script>
<sp-dialog-wrapper
        bind:this={content}
        error={error != null}
        headline={data.title}
        footer={error ? error : data.footer}
        mode={data.mode}
        size={data.size}
        no-divider={data.divider ? undefined : ''}
        responsive={!!data.responsive}
        dismissable={!isWorking && data.dismissable !== false}
        underlay={data.underlay !== false}

        confirm-label={data.confirm?.label || undefined}
        secondary-label={data.secondary?.label || undefined}
        cancel-label={data.cancel?.label || undefined}

        on:cancel={onCancel}
        on:confirm={onConfirm}
        on:secondary={onSecondary}
>
    <slot isWorking={isWorking} action={onAction} />
</sp-dialog-wrapper>
<style>
    sp-dialog-wrapper[error] {
        --spectrum-dialog-confirm-description-text-color: var(--spectrum-semantic-negative-color-icon);
    }
</style>
