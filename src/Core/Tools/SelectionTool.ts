/*
 * Copyright 2021 Zindex Software
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type {CanvasEngine, Element, Guide, ToolMouseEvent} from "@zindex/canvas-engine";
import {
    AxisPointPosition,
    BaseTool,
    Cursor,
    invertPosition,
    Point,
    Position,
    ProjectEvent,
    Rectangle,
    ToolUtils,
} from "@zindex/canvas-engine";
import {KeyframeCounter} from "./KeyframeCounter";

enum Action {
    None,
    Hover,
    Move,
    Select,
    RectangleSelection,
    Pan,
    Resize,
    Guide,
}

class SelectionUtils extends ToolUtils {
    constructor() {
        super();
        this.registerPen('guide-hover', 1);
    }

    drawHoveredGuide(engine: CanvasEngine, guide: Guide): void {
        const context = engine.context;

        const topLeft = engine.viewBox.matrix.inversePoint(0, 0);
        const bottomRight = engine.viewBox.matrix.inversePoint(engine.boundingBox.width, engine.boundingBox.height);

        const pen = this.getPen('guide-hover');

        if (guide.isHorizontal) {
            context.drawLine(
                {x: topLeft.x, y:guide.position},
                {x: bottomRight.x, y:guide.position},
                pen
            );
        } else {
            context.drawLine(
                {x: guide.position, y: topLeft.y},
                {x: guide.position, y: bottomRight.y},
                pen
            );
        }
    }

    getHoveredGuide(engine: CanvasEngine, position: Point): Guide | null {
        if (engine.lockGuides || !engine.showGuides) {
            return null;
        }

        const guides = engine.document.guides;
        if (guides.isEmpty) {
            return null;
        }

        const tolerance = engine.dpr / engine.viewBox.zoom;

        for (const guide of guides) {
            if (guide.isHorizontal) {
                if (Math.abs(guide.position - position.y) <= tolerance) {
                    return guide;
                }
            } else {
                if (Math.abs(guide.position - position.x) <= tolerance) {
                    return guide;
                }
            }
        }

        return null;
    }
}

export class SelectionTool extends BaseTool {
    private position: Point = null;
    private hoverElement: Element | null = null;
    private moveByMiddle: boolean = true;

    private action: Action = Action.None;
    private changed: boolean = false;

    private keyframeCounter: KeyframeCounter = new KeyframeCounter();

    private utils: SelectionUtils = new SelectionUtils();

    get name(): string {
        return "selection";
    }

    get allowGuideCreation(): boolean {
        return true;
    }

    constructor() {
        super();
        this.defaultCanvasCursor = Cursor.Arrow;
    }

    deactivate(engine: CanvasEngine) {
        super.deactivate(engine);
        this.selectionStart = null;
        this.selectionEnd = null;
        this.position = null;
        this.hoverElement = null;
        this.resizePosition = null;
        this.action = Action.None;
        this.doMouseUp = this.doMouseMove = null;
    }

    updateTheme(engine: CanvasEngine) {
        this.utils.updateTheme(engine.theme);
    }

    onDocumentChanged(engine: CanvasEngine) {
        this.restoreAction(engine, engine.currentDocumentPosition);
        this.refreshCursor(engine);
        super.onDocumentChanged(engine);
    }

    onKeyboardStatusChange(engine: CanvasEngine, event: KeyboardEvent) {
        if (this.isWorking) {
            return;
        }

        if (this.hoverElement && (event.key === "Shift" || engine.keyboardStatus.eventKeyIsCtrl(event))) {
            this.restoreAction(engine, engine.currentDocumentPosition);
            this.refreshCursor(engine);
            return;
        }
    }

    draw(engine: CanvasEngine) {
        this.drawTool(engine);
        this.refreshCursor(engine);
    }

    protected restoreAction(engine: CanvasEngine, position: Point, invalidate?: boolean) {
        let invalidateTool: boolean = false;

        const guide = this.utils.getHoveredGuide(engine, position);

        if (guide) {
            invalidateTool = guide !== this.hoverGuide;
            this.hoverGuide = guide;
            this.action = Action.Guide;
            this.hoverElement = null;
            this.moveByMiddle = false;
            this.resizePosition = null;
        } else {
            if (this.hoverGuide) {
                this.hoverGuide = null;
                invalidateTool = true;
            }

            const selection = engine.selection;

            let handle: AxisPointPosition = null;

            if (selection.length === 1) {
                handle = this.utils.getElementBoxHandle(selection.activeElement, position, true);
            }

            if (handle) {
                if (handle.x === Position.Middle && handle.y === Position.Middle) {
                    if (!this.moveByMiddle || this.hoverElement) {
                        invalidateTool = true;
                    }
                    this.moveByMiddle = true;
                    this.resizePosition = null;
                    this.action = Action.Move;
                } else {
                    if (this.moveByMiddle || this.hoverElement || !this.resizePosition || handle.x !== this.resizePosition.x || handle.y !== this.resizePosition.y) {
                        invalidateTool = true;
                    }
                    this.moveByMiddle = false;
                    this.resizePosition = {x: handle.x, y: handle.y};
                    this.action = Action.Resize;
                }
                this.hoverElement = null;
            } else {
                if (this.moveByMiddle) {
                    this.moveByMiddle = false;
                    invalidateTool = true;
                }

                if (this.resizePosition != null) {
                    this.resizePosition = null;
                    invalidateTool = true;
                }

                const hover = this.utils.getHoveredElement(engine, position);

                if (hover) {
                    if (hover !== this.hoverElement) {
                        this.hoverElement = hover;
                        invalidateTool = true;
                        this.action = Action.Hover;
                    }
                } else {
                    if (this.hoverElement) {
                        this.hoverElement = null;
                        invalidateTool = true;
                    }
                    this.action = Action.None;
                }
            }
        }

        if (invalidate) {
            this.invalidate();
        } else if (invalidateTool) {
            this.invalidateToolDrawing();
        }
    }

    onMouseEnter(engine: CanvasEngine, event: ToolMouseEvent) {
        if (!this.isWorking) {
            this.restoreAction(engine, event.position);
        }
    }

    protected refreshCursor(engine: CanvasEngine): void {
        switch (this.action) {
            case Action.Hover:
                if (this.moveByMiddle) {
                    engine.cursor = Cursor.ArrowMove;
                } else {
                    engine.cursor = !engine.keyboardStatus.isShift && engine.selection.isSelected(this.hoverElement)
                        ? Cursor.ArrowMove
                        : Cursor.ArrowSelectable;
                }
                break;
            case Action.Select:
                engine.cursor = Cursor.ArrowMove;
                break;
            case Action.Move:
                engine.cursor = Cursor.ArrowMove;
                break;
            case Action.RectangleSelection:
                engine.cursor = Cursor.Arrow;
                break;
            case Action.Pan:
                engine.cursor = Cursor.HandHold;
                break;
            case Action.Resize:
                engine.cursor = Cursor.ArrowResize;
                break;
            case Action.Guide:
                engine.cursor = this.hoverGuide.isHorizontal ? Cursor.ResizeNS : Cursor.ResizeEW;
                break;
            default:
                engine.cursor = this.moveByMiddle ? Cursor.ArrowMove : this.defaultCanvasCursor;
                break;
        }
    }

    protected drawTool(engine: CanvasEngine): void {
        if (this.selectionStart != null) {
            this.utils.drawSelectionAreaRectangle(engine, this.selectionStart, this.selectionEnd);
            return;
        }

        const context = engine.context;
        context.save();
        context.setViewBox(engine.viewBox);
        this.utils.setScale(engine);

        if (this.hoverGuide != null) {
            this.utils.drawHoveredGuide(engine, this.hoverGuide);
            context.restore();
            return;
        }

        const selection = engine.selection;

        if (!this.isWorking && this.hoverElement && !selection.isSelected(this.hoverElement)) {
            this.utils.drawElementOutline(context, this.hoverElement);
        }

        if (selection.isEmpty) {
            context.restore();
            // nothing to draw
            return;
        }

        this.utils.drawSelectionWrapper(context, selection.boundingBox);
        if (selection.length === 1) {
            this.utils.drawElementBoundingBox(context, selection.activeElement, true, true);
        } else {
            for (const element of selection) {
                this.utils.drawElementBoundingBox(context, element, false);
            }
        }

        context.restore();
    }

    onMouseHover(engine: CanvasEngine, event: ToolMouseEvent) {
        this.restoreAction(engine, event.position);
    }

    onMouseLeftButtonDown(engine: CanvasEngine, event: ToolMouseEvent) {
        this.isWorking = true;
        this.changed = false;

        // Handle guide
        if (this.hoverGuide) {
            return this.onGuideStart(engine);
        }

        // Handle resize
        if (this.resizePosition != null) {
            return this.onResizeStart(engine);
        }

        // Handle move by middle
        if (this.moveByMiddle) {
            return this.onMoveStart(engine);
        }

        // Handle rectangle selection
        if (this.hoverElement == null) {
            this.action = Action.RectangleSelection;
            return this.onSelectionStart(engine, event);
        }

        const selection = engine.selection;

        // Handle move
        if (selection.isSelected(this.hoverElement)) {
            if (this.keyboardStatus.isShift) {
                selection.deselect(this.hoverElement);
                engine.emit(ProjectEvent.selectionChanged);
                this.restoreAction(engine, event.position);
                return;
            }
            return this.onMoveStart(engine);
        }

        // Handle element selection
        if (selection.select(this.hoverElement, this.keyboardStatus.isShift)) {
            engine.emit(ProjectEvent.selectionChanged);
            return this.onMoveStart(engine);
        }
    }

    onMouseLeftButtonMove(engine: CanvasEngine, event: ToolMouseEvent) {
        if (this.doMouseMove) {
            return this.doMouseMove(engine, event);
        }
    }

    onMouseLeftButtonUp(engine: CanvasEngine, event: ToolMouseEvent) {
        if (this.doMouseUp) {
            this.doMouseUp(engine, event);
        }

        this.isWorking = false;
        this.changed = false;
        this.doMouseMove = this.doMouseUp = null;

        this.removeSnapping();
        this.restoreAction(engine, event.position, true);
    }

    private doMouseMove: (engine: CanvasEngine, event: ToolMouseEvent) => void = null;
    private doMouseUp: (engine: CanvasEngine, event?: ToolMouseEvent) => void = null;

    // ---

    private selectionStart: Point = null;
    private selectionEnd: Point = null;

    onSelectionStart(engine: CanvasEngine, event: ToolMouseEvent) {
        this.selectionStart = event.position;
        this.selectionEnd = null;
        this.doMouseMove = this.onSelectionMove;
        this.doMouseUp = this.onSelectionEnd;

        if (engine.selection.clear()) {
            engine.emit(ProjectEvent.selectionChanged);
        }
        this.invalidateToolDrawing();
    }

    onSelectionMove(engine: CanvasEngine, event: ToolMouseEvent) {
        this.selectionEnd = event.position;
        this.invalidateToolDrawing();
    }

    onSelectionEnd(engine: CanvasEngine, event: ToolMouseEvent) {
        const selection = engine.selection;
        if (selection.rectSelect(
            Rectangle.fromTransformedPoints(engine.document.globalMatrix, this.selectionStart, event.position),
            engine.document,
            this.keyboardStatus.isCtrl
        )) {
            engine.emit(ProjectEvent.selectionChanged);
        }
        this.selectionStart = this.selectionEnd = null;
    }

    private box: Rectangle = null;
    private totalMoveDelta: Point = null;

    onMoveStart(engine: CanvasEngine) {
        this.action = Action.Move;
        this.invalidateToolDrawing();
        this.keyframeCounter.start(engine);
        this.box = engine.selection.boundingBox;
        this.totalMoveDelta = Point.ZERO;
        this.snapping.init(engine, engine.selection);
        this.doMouseMove = this.onMove;
        this.doMouseUp = this.onMoveEnd;
    }

    onMove(engine: CanvasEngine, event: ToolMouseEvent) {
        let delta: Point = event.position.sub(this.startPosition);
        if (delta.isZero) {
            return;
        }

        if (this.keyboardStatus.isShift) {
            delta = this.snapping.snapBoundsAxis(this.box, delta);
        } else {
            delta = this.snapping.snapBounds(this.box, delta);
        }

        const total = this.totalMoveDelta;

        if (total.equals(delta)) {
            return;
        }

        this.totalMoveDelta = delta;

        // calculate current delta
        delta = delta.sub(total);

        if (engine.project.middleware.moveElementsBy(engine.selection, delta)) {
            this.invalidate();
            engine.emit(ProjectEvent.propertyChanged);
        }
    }

    onMoveEnd(engine: CanvasEngine) {
        this.snapshotIfNeeded(engine, !this.totalMoveDelta.isZero);
        this.box = null;
        this.totalMoveDelta = null;
    }

    private hoverGuide: Guide | null = null;
    private guideStartPosition: number;

    onGuideStart(engine: CanvasEngine) {
        this.guideStartPosition = this.hoverGuide.position;
        this.hoverGuide.isHidden = true;
        this.snapping.init(engine);
        this.invalidate();
        this.doMouseMove = this.onGuideMove;
        this.doMouseUp = this.onGuideEnd;
    }

    onGuideMove(engine: CanvasEngine, event: ToolMouseEvent) {
        this.hoverGuide.position = this.snapping.snapPoint(
            this.keyboardStatus.isShift ? event.position.rounded() : event.position,
            this.hoverGuide.isHorizontal ? 'x' : 'y', // lock
        )[this.hoverGuide.isHorizontal ? 'y' : 'x'];
        this.invalidateToolDrawing();
    }

    onGuideEnd(engine: CanvasEngine, event: ToolMouseEvent) {
        const horizontal = this.hoverGuide.isHorizontal;

        const guide = this.hoverGuide;
        guide.isHidden = false;

        const guides = engine.document.guides;

        if ((horizontal && event.canvasPosition.y < 0) || (!horizontal && event.canvasPosition.x < 0) || guides.exists(guide.position, guide.isHorizontal, guide)) {
            guides.remove(guide);
            this.changed = true;
        } else if (guide.position !== this.guideStartPosition) {
            this.changed = true;
        }

        this.snapshotIfNeeded(engine, this.changed);
    }

    private resizePosition: AxisPointPosition | null = null;

    onResizeStart(engine: CanvasEngine) {
        this.snapping.init(engine, engine.selection);
        this.position = engine.selection.activeElement.globalBounds.getPointAtPosition(this.resizePosition.x, this.resizePosition.y);
        this.keyframeCounter.start(engine);
        this.doMouseMove = this.onResize;
        this.doMouseUp = this.onResizeEnd;
    }

    onResize(engine: CanvasEngine, event: ToolMouseEvent) {
        const active = engine.selection.activeElement;

        const {matrix, flip} = engine.project.middleware.computeResizeInfo(
            active,
            this.snapping.snapPoint(event.position),
            this.resizePosition,
            this.keyboardStatus.isAlt,
            this.keyboardStatus.isShift
        );
        if (flip.x) {
            this.resizePosition.x = invertPosition(this.resizePosition.x);
        }
        if (flip.y) {
            this.resizePosition.y = invertPosition(this.resizePosition.y);
        }
        if (engine.project.middleware.resizeElementByMatrix(active, matrix, flip)) {
            this.changed = true;
            this.invalidate();
            engine.emit(ProjectEvent.propertyChanged);
        }
    }

    onResizeEnd(engine: CanvasEngine) {
        this.snapshotIfNeeded(engine, this.changed);
        this.resizePosition = null;
    }

    /**
     * Create a snapshot if something has changed
     */
    protected snapshotIfNeeded(engine: CanvasEngine, changed?: boolean): void {
        if (changed || this.keyframeCounter.hasChanged(engine)) {
            engine.project.state.snapshot();
        }
        this.changed = false;
    }

    onMouseWheelButtonDown(engine: CanvasEngine, event: ToolMouseEvent) {
        super.onMouseWheelButtonDown(engine, event);
        this.action = Action.Pan;
        this.invalidateToolDrawing();
    }

    onMouseWheelButtonUp(engine: CanvasEngine, event: ToolMouseEvent) {
        super.onMouseWheelButtonUp(engine, event);
        this.restoreAction(engine, event.position);
    }

    onMouseWheel(engine: CanvasEngine, event: ToolMouseEvent) {
        super.onMouseWheel(engine, event);
        if (!this.isWorking) {
            this.restoreAction(engine, event.position);
        }
    }
}