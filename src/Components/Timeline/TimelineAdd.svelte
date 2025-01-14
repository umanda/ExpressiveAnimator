<script lang="ts">
    import CascadeMenu from "../CascadeMenu";
    import {CurrentProject, CurrentSelection} from "../../Stores";

    import {
        TransformAnimators,
        ElementAnimators,
        DefaultAnimatorsMap,
        FillAnimators,
        StrokeAnimators,
    } from "../../Core";
    import {getElementTitleByType} from "../../Core";
    import {Element, VectorElement} from "@zindex/canvas-engine";

    function createItemFromAnimators(title: string, animators) {
        const children = [];
        for (const [property, animator] of Object.entries(animators)) {
            if (animator.type != null) {
                continue;
            }
            children.push({
                title: animator.title,
                action: {property, animator},
            });
        }
        return {title, children};
    }

    function createSpecificItems() {
        const obj = {};

        for (const [type, animators] of Object.entries(DefaultAnimatorsMap)) {
            const children = [];
            for (const [property, animator] of Object.entries(animators)) {
                if (animator.type === type) {
                    children.push({
                        title: animator.title,
                        action: {property, animator},
                    });
                }
            }
            if (children.length > 0) {
                obj[type] = {title: getElementTitleByType(type), children};
            }
        }

        return obj;
    }

    const fillItem = createItemFromAnimators('Fill', FillAnimators);
    const strokeItem = createItemFromAnimators('Stroke', StrokeAnimators);
    const transformItem = createItemFromAnimators('Transform', TransformAnimators);
    const compositingItem = createItemFromAnimators('Compositing', ElementAnimators);
    const specificItems = createSpecificItems();

    function getItems(elements: Element[]) {
        let isVector: boolean = false;
        const types = [];

        let items = [];

        for (const element of elements) {
            if (types.indexOf(element.type) !== -1) {
                continue;
            }
            types.push(element.type);

            if (element.type in specificItems) {
                items.push(specificItems[element.type]);
            }

            if (element instanceof VectorElement) {
                isVector = true;
            }
        }

        if (items.length > 0) {
            items.push(null);
        }

        if (isVector) {
            items.push(fillItem);
            items.push(strokeItem);
            items.push(null);
        }

        items.push(transformItem);
        items.push(compositingItem);

        return items;
    }

    export let disabled: boolean = false;


    let open: boolean = false;
    let items = [];

    function onOpen() {
        items = getItems(Array.from($CurrentSelection.elements));
        open = true;
    }

    function onClose() {
        setTimeout(() => {
            open = false;
            items = [];
        }, 100);
    }

    function onAction(e: CustomEvent) {
        const action = e.detail.action;
        const project = $CurrentProject;
        const source = project.animatorSource;

        let added: boolean = false;

        for (const element of $CurrentSelection) {
            if (action.animator.type != null && action.animator.type !== element.type) {
                continue;
            }

            if (!source.isAnimatable(element, action.property)) {
                continue;
            }

            const animatedProperties = project.document.animation.getAnimatedProperties(element);

            if (animatedProperties != null) {
                let exists: boolean = false;
                for (const [item] of Object.values(animatedProperties)) {
                    if (item.animator === action.animator) {
                        exists = true;
                        break;
                    }
                }
                if (exists) {
                    continue;
                }
            }

            const animation = source.createAnimation(element, action.property);
            if (animation == null) {
                continue;
            }

            if (!project.document.animation.addAnimation(element, animation)) {
                continue;
            }

            project.middleware.setElementProperty(element, action.property, element[action.property]);

            added = true;
        }

        if (added) {
            project.middleware.updateAnimatedProperties(project.document);
            project.state.snapshot();
        }
    }
</script>
<overlay-trigger placement="top-start"
                 type="modal"
                 offset={-6}
                 on:sp-closed={onClose}
>
    <sp-action-button title="Add animator"
                      on:click={onOpen}
                      disabled={disabled || $CurrentSelection.length === 0} slot="trigger">
        <sp-icon size="m" name="expr:add-color" slot="icon"></sp-icon>
    </sp-action-button>
    <CascadeMenu slot="click-content" open={open} on:action={onAction} items={items} />
</overlay-trigger>