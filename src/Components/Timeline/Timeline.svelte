<script lang="ts">
    import TimelineItem from "./TimelineItem.svelte";
    // import TimelineLocalMarker from "./TimelineLocalMarker.svelte";
    import TimelineSelectionRect from "./TimelineSelectionRect.svelte";
    import TimelineElementWrapper from "./TimelineElementWrapper.svelte";
    import TimelineKeyfreamesLine from "./TimelineKeyfreamesLine.svelte";
    import type {AnimatedProperty} from "../../Stores";
    import {
        CurrentAnimatedElements,
        CurrentKeyframeSelection,
        CurrentProject,
        CurrentSelection,
        CurrentSelectedElement,
        CurrentTime,
        CurrentTimelineFilterMode,
        TimelineFollowMode,
        TimelineIsWorking,
        notifyKeyframeSelectionChanged,
        notifyPropertiesChanged,
        notifySelectionChanged,
        TimelineFilterMode,
    } from "../../Stores";
    import type {Element, Selection} from "@zindex/canvas-engine";
    import {MouseButton, Point, Rectangle} from "@zindex/canvas-engine";
    import type {Animation, Keyframe} from "../../Core";
    import {getRoundedDeltaTimeByX, getXAtTime} from "./utils";
    import {tick} from "svelte";

    export let zoom: number = 1;
    export let scaleFactor: number = 1;
    export let scrollTop: number = 0;
    export let scrollLeft: number = 0;
    export let disabled: boolean = false;

    /* Scroll sync Y */
    let leftPane: HTMLElement;
    let rightPane: HTMLElement;

    let selectionRect: Rectangle = null;
    let selectionRectPivot = null;

    let reRender: number = 1;
    let deselectKeyframe: Keyframe<any> = null;
    let startKeyframe: Keyframe<any> = null;
    let startOffset: number = 0;
    let positionDelta: number = 0;
    let isMoving: boolean = false;
    let position: number = 0;
    let currentSelectionData: { animations: Set<Animation<any>>, keyframes: Set<Keyframe<any>> } = null;

    function handleScroll(event: Event) {
        if (event.target === rightPane) {
            if (scrollTop !== rightPane.scrollTop) {
                scrollTop = rightPane.scrollTop;
            }
            if (scrollLeft !== rightPane.scrollLeft) {
                scrollLeft = rightPane.scrollLeft;
            }
            if (leftPane.scrollTop !== scrollTop) {
                leftPane.scrollTop = scrollTop;
            }
        } else {
            if (scrollTop !== leftPane.scrollTop) {
                scrollTop = leftPane.scrollTop;
            }
            if (rightPane.scrollTop !== scrollTop) {
                rightPane.scrollTop = scrollTop;
            }
        }
    }

    function handleWheel(event: WheelEvent) {
        event.preventDefault();
        event.stopImmediatePropagation();
        let {deltaY, deltaX, shiftKey} = event;

        if (shiftKey) {
            deltaX = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
            deltaY = 0;
        }

        if (deltaX !== 0 && rightPane.contains(event.target as HTMLElement)) {
            rightPane.scrollLeft += deltaX;
        }

        if (deltaY !== 0) {
            leftPane.scrollTop += deltaY;
            rightPane.scrollTop += deltaY;
        }
    }

    function getTimelinePoint(e: PointerEvent): Point {
        return new Point(
            e.clientX - rightPane.offsetLeft + rightPane.scrollLeft,
            e.clientY - rightPane.offsetTop + rightPane.scrollTop
        );
    }

    let previousSelection = null;

    function onTimelinePointerDown(e: PointerEvent) {
        if (!e.isPrimary || e.button !== MouseButton.Left) {
            return;
        }

        $TimelineIsWorking = true;

        const target = e.target as HTMLElement;
        if (target.classList.contains('timeline-keyframe') ||
            target.classList.contains('timeline-easing')) {
            return;
        }

        // if ((e.clientX - rightPane.offsetWidth - rightPane.offsetLeft > rightPane.clientWidth - rightPane.offsetWidth) ||
        //     (e.clientY - rightPane.offsetHeight - rightPane.offsetTop > rightPane.clientHeight - rightPane.offsetHeight)) {

        if ((e.clientX - rightPane.offsetLeft > rightPane.clientWidth) ||
            (e.clientY - rightPane.offsetTop > rightPane.clientHeight)) {
            // click on scrollbar
            return;
        }

        if (e.shiftKey) {
            previousSelection = $CurrentKeyframeSelection.getSelectedKeyframes();
        } else {
            previousSelection = null;
            if ($CurrentKeyframeSelection.clear()) {
                notifyKeyframeSelectionChanged();
            }
        }

        selectionRectPivot = getTimelinePoint(e);

        rightPane.addEventListener('pointermove', onTimelinePointerMove);
        rightPane.addEventListener('pointerup', onTimelinePointerUp);
        rightPane.setPointerCapture(e.pointerId);
    }

    function onTimelinePointerMove(e: PointerEvent) {
        if (!e.isPrimary) {
            return;
        }
        selectionRect = Rectangle.fromPoints(selectionRectPivot, getTimelinePoint(e));
    }

    function* getKeyframeIdsFromRect(pane: HTMLElement, rect: Rectangle): Generator<string> {
        if (!rect || !rect.isVisible) {
            return;
        }

        for (const element of pane.querySelectorAll('.timeline-keyframe')) {
            const bounds = (element as HTMLElement).getBoundingClientRect();
            if (rect.contains(bounds.x + pane.scrollLeft - pane.offsetLeft + bounds.width / 2, bounds.y + pane.scrollTop - pane.offsetTop + bounds.height / 2)) {
                yield (element as HTMLElement).getAttribute('data-keyframe-id');
            }
        }
    }

    function onTimelinePointerUp(e: PointerEvent) {
        if (!e.isPrimary || e.button !== MouseButton.Left) {
            return;
        }

        $TimelineIsWorking = false;

        rightPane.removeEventListener('pointermove', onTimelinePointerMove);
        rightPane.removeEventListener('pointerup', onTimelinePointerUp);
        rightPane.releasePointerCapture(e.pointerId);

        if ($CurrentKeyframeSelection.selectKeyframeIds(getKeyframeIdsFromRect(rightPane, selectionRect))) {
            if (previousSelection) {
                $CurrentKeyframeSelection.selectKeyframeIds(previousSelection);
            }
            notifyKeyframeSelectionChanged();
        }

        previousSelection = null;
        selectionRectPivot = null;
        selectionRect = null;
    }

    function prepareMove(e: PointerEvent, keyframe: Keyframe<any>) {
        rightPane.addEventListener('pointermove', onKeyframePointerMove);
        rightPane.addEventListener('pointerup', onKeyframePointerUp);
        rightPane.setPointerCapture(e.pointerId);

        position = e.clientX;
        isMoving = false;

        startKeyframe = keyframe;
        startOffset = keyframe.offset;
        positionDelta = getXAtTime(keyframe.offset, scrollLeft, zoom) + rightPane.offsetLeft - position;
    }

    function destroyMove(e: PointerEvent) {
        rightPane.removeEventListener('pointermove', onKeyframePointerMove);
        rightPane.removeEventListener('pointerup', onKeyframePointerUp);
        rightPane.releasePointerCapture(e.pointerId);
        deselectKeyframe = null;
        currentSelectionData = null;
        startKeyframe = null;
        isMoving = false;
    }

    function onEasingPointerDown(e: PointerEvent, element: Element, info: AnimatedProperty, keyframe: Keyframe<any>) {
        if (e.button !== MouseButton.Left) {
            return;
        }

        $TimelineIsWorking = true;

        const index = info.animation.getIndexOfKeyframe(keyframe);
        const next = index === -1 ? null : info.animation.getKeyframeAtIndex(index + 1);

        if (next != null && (e.ctrlKey || e.metaKey)) {
            CurrentTime.set(Math.round((keyframe.offset + next.offset) / 2));
        }

        const selection = $CurrentKeyframeSelection;

        if (!selection.areKeyframesSelected(keyframe, next)) {
            if (!e.shiftKey) {
                selection.clear();
            }
            selection.selectKeyframe(keyframe, true);
            if (next) {
                selection.selectKeyframe(next, true);
            }
            notifyKeyframeSelectionChanged();
        }

        prepareMove(e, keyframe);
    }

    function onKeyframePointerDown(e: PointerEvent, element: Element, info: AnimatedProperty, keyframe: Keyframe<any>) {
        if (e.button !== MouseButton.Left) {
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            CurrentTime.set(keyframe.offset);
        }

        $TimelineIsWorking = true;

        if ($CurrentKeyframeSelection.selectKeyframe(keyframe, e.shiftKey)) {
            notifyKeyframeSelectionChanged();
        } else if (e.shiftKey) {
            deselectKeyframe = keyframe;
        }

        prepareMove(e, keyframe);
    }

    function getKeyframeMoveDelta(x: number): number {
        return getRoundedDeltaTimeByX(x, startKeyframe.offset, zoom, scaleFactor);
    }

    function onKeyframePointerMove(e: PointerEvent) {
        const delta = getKeyframeMoveDelta(e.clientX - position);

        if (delta === 0) {
            return;
        }

        position = rightPane.offsetLeft + getXAtTime(startKeyframe.offset + delta, rightPane.scrollLeft, zoom) - positionDelta;

        if (!isMoving) {
            isMoving = true;
            currentSelectionData = $CurrentKeyframeSelection.resolveSelectedKeyframes();
        }

        for (const k of currentSelectionData.keyframes) {
            k.offset += delta;
        }

        // re-eval
        const project = $CurrentProject;
        if (project.middleware.updateAnimations(currentSelectionData)) {
            project.engine?.invalidate();
            notifyPropertiesChanged();
        }

        // force update of keyframe offsets
        reRender++;
    }

    function onKeyframePointerUp(e: PointerEvent) {
        if (isMoving && startOffset !== startKeyframe.offset) {
            const project = $CurrentProject;

            // we directly fix keyframes, animated properties are updated below
            for (const animation of currentSelectionData.animations) {
                animation.fixKeyframes(currentSelectionData.keyframes);
            }

            if (project.middleware.updateAnimatedProperties(project.document)) {
                project.engine?.invalidate();
            }

            snapshot();
        } else if (!isMoving && deselectKeyframe != null) {
            if ($CurrentKeyframeSelection.deselectKeyframe(deselectKeyframe)) {
                notifyKeyframeSelectionChanged();
            }
        }

        destroyMove(e);

        $TimelineIsWorking = false;
    }

    function onAddKeyframe(e: CustomEvent<AnimatedProperty>) {
        if (disabled) {
            return;
        }

        const time = $CurrentTime;
        if (e.detail.animation.getKeyframeAtOffset(time) == null) {
            const keyframe = e.detail.animation.addKeyframeAtOffset(time, null);
            // TODO: improve this
            $CurrentProject.middleware.updateAnimations({animations: new Set([e.detail.animation])});
            $CurrentKeyframeSelection.clear();
            $CurrentKeyframeSelection.selectKeyframe(keyframe);
            snapshot();
        }
    }

    function onElementSelect(e: CustomEvent<{ element: Element, multiple: boolean }>) {
        if (disabled) {
            return;
        }
        if ($CurrentSelection.toggle(e.detail.element, e.detail.multiple)) {
            $CurrentProject.engine?.invalidate();
            notifySelectionChanged();
        }
    }

    function onSelectAnimationKeyframes(e: CustomEvent<{ animation: Animation<any>, multiple: boolean }>) {
        if ($CurrentKeyframeSelection.selectMultipleKeyframes(e.detail.animation.keyframes, e.detail.multiple)) {
            notifyKeyframeSelectionChanged();
        }
    }

    function snapshot() {
        $CurrentProject.state.snapshot();
        $CurrentProject.engine.invalidate();
    }

    function checkKeyframeSelection(filterMode: TimelineFilterMode, selection: Selection<any>) {
        if (filterMode === TimelineFilterMode.AllSelectedOrAnimated || filterMode === TimelineFilterMode.OnlyAnimated) {
            return;
        }
        if ($CurrentKeyframeSelection.deselectUnselectedElements(selection)) {
            notifyKeyframeSelectionChanged();
        }
    }

    async function scrollElementIntoView(element: Element | null) {
        if (element == null) {
            return;
        }

        await tick();

        const item = leftPane.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
        if (!item) {
            return;
        }

        const scroll = item.offsetTop - leftPane.offsetTop;

        if ((scroll < leftPane.scrollTop) || (scroll + item.offsetHeight > leftPane.scrollTop + leftPane.offsetHeight)) {
            item.scrollIntoView();
        }
    }

    let playLine: HTMLElement;

    $: checkKeyframeSelection($CurrentTimelineFilterMode, $CurrentSelection);
    $: $TimelineFollowMode && $CurrentTimelineFilterMode !== null && scrollElementIntoView($CurrentSelectedElement);

    // use on individual elements
    $: playLine && playLine.style.setProperty('--timeline-play-offset', $CurrentTime.toString());
    $: playLine && playLine.style.setProperty('--timeline-scroll-top', scrollTop + 'px');
</script>
<div class="timeline" on:contextmenu>
    <div bind:this={leftPane} on:scroll={handleScroll} on:wheel={handleWheel}
         class="timeline-elements scroll scroll-invisible scroll-no-padding" hidden-x>
        {#each $CurrentAnimatedElements as animated (animated.element.id)}
            <TimelineElementWrapper
                    animated={animated}
                    selected={$CurrentSelection.isSelected(animated.element)}
                    selection={$CurrentKeyframeSelection}
                    on:select={onElementSelect}
                    on:add={onAddKeyframe}
                    on:selectAnimationKeyframes={onSelectAnimationKeyframes}
            />
        {/each}
    </div>
    <div bind:this={rightPane} on:scroll={handleScroll} on:wheel={handleWheel} on:pointerdown={onTimelinePointerDown}
         class="timeline-keyframes scroll scroll-no-hide scroll-no-padding">
        <div class="timeline-items-wrapper">
            {#each $CurrentAnimatedElements as animated}
                <TimelineItem isAlt={true}>
<!--                  <TimelineLocalMarker label="This is a marker" color="seafoam" offset={300} length={1200} lines={animated.animations.length + 1} />-->
                </TimelineItem>
                {#each animated.animatedProperties as animatedProperty}
                    <TimelineItem keyframes={true} disabled={animatedProperty.animation.disabled}>
                        <TimelineKeyfreamesLine
                                on:keyframe={e => onKeyframePointerDown(e.detail.event, animated.element, animatedProperty, e.detail.keyframe)}
                                on:easing={e => onEasingPointerDown(e.detail.event, animated.element, animatedProperty, e.detail.keyframe)}
                                animation={animatedProperty.animation}
                                moving={isMoving}
                                renderId={reRender}
                        />
                    </TimelineItem>
                {/each}
            {/each}
        </div>
        <TimelineSelectionRect rect={selectionRect} />
        <div bind:this={playLine} class="timeline-play-line"></div>
    </div>
</div>
<style global>
    .timeline {
        flex: 1;
        display: flex;
        flex-direction: row;
        min-height: 0;

        --timeline-item-height: var(--spectrum-alias-item-height-s);
        --timeline-keyframe-size: calc(var(--timeline-item-height) / 2 + 1px);
        /*--timeline-keyframe-size: calc(var(--timeline-item-height) / 2 + 3px);*/

        background: var(--spectrum-global-color-gray-100);
    }

    .timeline, .timeline * {
        box-sizing: border-box;
    }

    .timeline > .timeline-elements {
        width: 240px;
        border-right: 1px solid var(--separator-color);
        border-bottom: var(--scrollbar-width) solid transparent;
    }

    .timeline > .timeline-keyframes {
        touch-action: none;
        position: relative;
        flex: 1;
    }

    .timeline > .timeline-keyframes > .timeline-items-wrapper {
        position: relative;
        min-width: 100%;
        /* this gives the width */
        width: calc(var(--timeline-max-offset) * var(--timeline-ms-unit));
    }

    .timeline > .timeline-keyframes > .timeline-play-line {
        z-index: 5;
        --timeline-play-line-size: 1px;
        width: var(--timeline-play-line-size);
        user-select: none;
        pointer-events: none;
        position: absolute;
        top: var(--timeline-scroll-top);
        bottom: calc(0px - var(--timeline-scroll-top));
        left: calc(calc(var(--timeline-keyframe-size) - var(--timeline-play-line-size)) / 2);
        transform: translateX(calc(var(--timeline-play-offset) * var(--timeline-ms-unit)));
        background: var(--spectrum-global-color-blue-500);
        will-change: top, bottom, transform;
    }
</style>