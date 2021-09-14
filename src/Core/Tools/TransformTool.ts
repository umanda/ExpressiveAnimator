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

import type {
    CanvasEngine,
    DrawingContext,
    Element,
    PathMoldingFunction,
    PathPositionInfo,
    ToolMouseEvent
} from "@zindex/canvas-engine";
import {
    AxisPointPosition,
    BaseTool,
    ConvexQuad,
    Cursor,
    HandleType,
    Matrix,
    Path,
    PathJoint,
    PathNode,
    Point,
    Position,
    ProjectEvent,
    Rectangle,
    ToolUtils
} from "@zindex/canvas-engine";
import type {AnimationDocument, AnimationProject, KeyframeSelection} from "../Project";
import {KeyframeCounter} from "./KeyframeCounter";
import type {Readable} from "svelte/store";
import type {Keyframe, MotionAnimation} from "../Animation";

class TransformUtils extends ToolUtils {
    public motionPath: Path = new Path();
    public selectedNodes: Set<number> = new Set<number>();
    public motionElement: Element = null;

    constructor() {
        super();
        this.registerPen('transform-rotate', 1, 'gray');
        this.registerSize('transform-rotate-radius', 2);
        this.registerSize('transform-rotate-offset', 10);

        this.registerPen('transform-origin', 1, 'magenta');
        this.registerSize('transform-origin-radius', 6);

        this.registerBrush('transform-angle', '#fb08');
    }

    getMotionPathInfo(position: Point): PathPositionInfo {
        if (this.motionElement == null || this.motionPath.isEmpty) {
            return null;
        }

        const matrix = this.getParentGlobalMatrix(this.motionElement);
        if (matrix) {
            position = matrix.inversePoint(position.x, position.y);
        }

        const nodeRadius = this.getSize('path-node-radius');
        const handleRadius = this.selectedNodes.size > 0 ? this.getSize('path-handle-radius') : null;

        const info = this.motionPath.getPositionInfo(
            position,
            nodeRadius,
            handleRadius,
            Math.max(nodeRadius, 0.1)
        );

        if (!info || (info.handle != null && !this.selectedNodes.has(info.index))) {
            // invisible handle
            return null;
        }

        return info;
    }

    get hasMotionPath(): boolean {
        return this.motionElement != null && !this.motionPath.isEmpty;
    }

    get motionAnimation(): MotionAnimation | null {
        if (this.motionElement == null) {
            return null;
        }

        const documentAnimation = (this.motionElement.document as AnimationDocument).animation;
        if (!documentAnimation) {
            return null;
        }

        return documentAnimation.getAnimation(this.motionElement, "position") as any;
    }

    get selectedKeyframes(): Keyframe<PathNode>[] | null {
        if (this.selectedNodes.size === 0) {
            return null;
        }
        const motion = this.motionAnimation;
        if (!motion) {
            return null;
        }

        const list = [];

        for (const index of this.selectedNodes) {
            if (motion.keyframes[index]) {
                list.push(motion.keyframes[index]);
            }
        }

        return list;
    }

    updateKeyframeSelection(selection: KeyframeSelection): boolean {
        const motion = this.motionAnimation;
        if (motion == null) {
            return false;
        }

        this.selectedNodes.clear();

        for (let i = 0, length = motion.keyframes.length; i < length; i++) {
            if (selection.isKeyframeSelected(motion.keyframes[i])) {
                this.selectedNodes.add(i);
            }
        }

        return true;
    }

    updateMotionPath(element: Element | null, selection?: KeyframeSelection): void {
        const path = this.motionPath;

        if (this.motionElement !== element) {
            this.motionElement = element;
            if (path.nodes.length > 0) {
                path.nodes.splice(0);
                path.invalidate();
            }
        }

        const motion = this.motionAnimation;
        if (!motion) {
            if (path.nodes.length > 0) {
                path.nodes.splice(0);
                path.invalidate();
            }
            return;
        }

        this.selectedNodes.clear();

        const kf = motion.keyframes;

        if (kf.length !== path.nodes.length) {
            path.nodes.splice(0);
            for (let i = 0, length = kf.length; i < length; i++) {
                path.nodes.push(kf[i].value as any);
                if (selection.isKeyframeSelected(kf[i])) {
                    this.selectedNodes.add(i);
                }
            }
            path.invalidate();
            return;
        }

        let changed: boolean = false;

        for (let i = 0, length = path.nodes.length; i < length; i++) {
            if (!path.nodes[i].equals(kf[i].value as any)) {
                path.nodes[i] = kf[i].value as any;
                changed = true;
            }
            if (selection.isKeyframeSelected(kf[i])) {
                this.selectedNodes.add(i);
            }
        }

        if (changed) {
            path.invalidate();
        }
    }

    updateMotionPathElement(engine: CanvasEngine): boolean {
        if (!this.motionElement) {
            return false;
        }

        const project = engine.project as AnimationProject;

        if (!project.middleware.updateElementAnimation(this.motionElement, "position")) {
            return false;
        }

        this.updateMotionPath(this.motionElement, project.keyframeSelection);

        engine.invalidate();

        return true;
    }

    private calcRotatePointPosition(middle: Point, corner: Point, offset: number): Point {
        return Point.fromDirection(middle.getDirectionTo(corner), middle.distanceTo(corner) + offset, middle);
    }

    drawRotateAngle(context: DrawingContext, position: Point, startAngle: number, endAngle: number, point: Point | null): void {
        // startAngle = (startAngle + 180) % 360
        // endAngle = (endAngle + 360) % 360;
        // endAngle -= startAngle;
        // if (endAngle < 0) {
        //     endAngle += 360;
        // }
        const size = this.getSize('transform-origin-radius') * 3;
        context.drawArc(Rectangle.fromLTRB(
            position.x - size,
            position.y - size,
            position.x + size,
            position.y + size
        ), startAngle, endAngle - startAngle, true, this.getBrush('transform-angle'));

        if (point) {
            context.drawLine(position, point, this.getPen('transform-origin'));
        }
    }

    drawRotatePoints(context: DrawingContext, element: Element): void {
        const pen = this.getPen('transform-rotate');
        const radius = this.getSize('transform-rotate-radius');
        const offset = this.getSize('transform-rotate-offset');

        const bounds = element.globalBounds;
        for (const point of bounds.points) {
            context.drawCircle(this.calcRotatePointPosition(bounds.middle, point, offset), radius, pen);
        }
    }

    getRotatePoint(element: Element, position: Point): Point | null {
        const radius = this.getSize('transform-rotate-radius');
        const offset = this.getSize('transform-rotate-offset');

        const bounds = element.globalBounds;
        for (const point of bounds.points) {
            if (position.distanceTo(this.calcRotatePointPosition(bounds.middle, point, offset)) <= radius) {
                return point;
            }
        }

        return null;
    }

    getOrigin(element: Element): Point {
        const matrix = this.getParentGlobalMatrix(element);
        return matrix ? matrix.transformPoint(element.position) : element.position;
    }

    drawOrigin(context: DrawingContext, element: Element): void {
        const radius = this.getSize('transform-origin-radius');
        const pen = this.getPen('transform-origin');

        const position = this.getOrigin(element);

        let rotateMatrix: Matrix = null;
        const angle = (element.totalRotate % 360) * Math.sign(element.globalMatrix.a * element.globalMatrix.d);
        if (angle) {
            rotateMatrix = (new Matrix())
                .translate(position.x, position.y)
                .rotate(angle)
                .translate(-position.x, -position.y);
        }

        const quad = ConvexQuad.fromPoints([
            {x: position.x, y: position.y - radius * 1.5},
            {x: position.x + radius * 1.5, y: position.y},
            {x: position.x, y: position.y + radius * 1.5},
            {x: position.x - radius * 1.5, y: position.y}
        ], rotateMatrix);

        context.drawCircle(position, radius, pen);
        context.drawLine(quad.points[0], quad.points[2], pen);
        context.drawLine(quad.points[1], quad.points[3], pen);
    }

    isOverOrigin(element: Element, position: Point): boolean {
        return position.distanceTo(this.getOrigin(element)) <= this.getSize('transform-origin-radius');
    }

    drawMotionPath(context: DrawingContext, element: Element, selection: KeyframeSelection): void {
        this.updateMotionPath(element, selection);
        if (this.motionPath.isEmpty) {
            return;
        }

        const matrix = this.getParentGlobalMatrix(element);
        this.drawPathLine(context, this.motionPath.path, matrix);
        this.drawSelectedPathHandles(context, this.motionPath.nodes, this.selectedNodes, matrix);
        this.drawPathPoints(context, this.motionPath.nodes, this.selectedNodes, matrix);
    }
}

enum Action {
    None,
    RectangleSelection,
    Pan,
    Move,
    Scale,
    Origin,
    Rotate,
    Motion
}

export class TransformTool extends BaseTool {
    private selectionStart: Point = null;
    private selectionEnd: Point = null;

    private position: Point = null;
    private hoverElement: Element | null = null;
    private hoverMotion: PathPositionInfo | null = null;

    private action: Action = Action.None;
    private changed: boolean = false;

    private keyframeCounter: KeyframeCounter = new KeyframeCounter();

    private utils: TransformUtils = new TransformUtils();
    private keyframeSelectionStore: Readable<KeyframeSelection>;
    private keyframeSelectionUnsubscribe: () => any = null;
    private notifyKeyframeSelectionChanged: () => void;

    constructor(
        keyframeSelectionStore: Readable<KeyframeSelection>,
        notifyKeyframeSelectionChanged: () => void
    ) {
        super();
        this.defaultCanvasCursor = Cursor.PointerAlt;
        this.keyframeSelectionStore = keyframeSelectionStore;
        this.notifyKeyframeSelectionChanged = notifyKeyframeSelectionChanged;
    }

    get name(): string {
        return "transform";
    }

    get allowGuideCreation(): boolean {
        return true;
    }

    private onKeyframeSelectionChange(): void {
        if (this.utils.hasMotionPath) {
            this.invalidateToolDrawing();
        }
    }

    activate(engine: CanvasEngine, data: any) {
        super.activate(engine, data);
        this.keyframeSelectionUnsubscribe = this.keyframeSelectionStore.subscribe(this.onKeyframeSelectionChange.bind(this));
    }

    deactivate(engine: CanvasEngine) {
        super.deactivate(engine);
        if (this.keyframeSelectionUnsubscribe) {
            this.keyframeSelectionUnsubscribe();
            this.keyframeSelectionUnsubscribe = null;
        }
        this.utils.updateMotionPath(null);
        this.selectionStart = null;
        this.selectionEnd = null;
        this.position = null;
        this.hoverElement = null;
        this.hoverMotion = null;
        this.boxHandlePosition = null;
        this.boxHandleStart = null;
        this.rotatePivot = null;
        this.originAngleReference = null;
        this.changed = false;
        this.action = Action.None;
    }

    updateTheme(engine: CanvasEngine) {
        this.utils.updateTheme(engine.theme);
    }

    onDocumentChanged(engine: CanvasEngine) {
        this.restoreAction(engine, engine.currentDocumentPosition, true);
        this.refreshCursor(engine);
        super.onDocumentChanged(engine);
    }

    draw(engine: CanvasEngine) {
        this.drawTool(engine);
        this.refreshCursor(engine);
    }

    protected refreshCursor(engine: CanvasEngine): void {
        switch (this.action) {
            case Action.Move:
                engine.cursor = Cursor.PointerMoveAlt;
                break;
            case Action.RectangleSelection:
                engine.cursor = Cursor.PointerAlt;
                break;
            case Action.Pan:
                engine.cursor = Cursor.HandHold;
                break;
            case Action.Rotate:
                engine.cursor = Cursor.RotateAlt;
                break;
            case Action.Origin:
                engine.cursor = Cursor.PointerOriginAlt;
                break;
            case Action.Scale:
                engine.cursor = Cursor.PointerResizeAlt;
                break;
            case Action.Motion:
                const m = this.hoverMotion;
                if (m.percent != null) {
                    // path
                    engine.cursor = this.keyboardStatus.isAlt ? Cursor.PointerAddAlt : Cursor.PointerCurveAlt;
                } else if (m.handle != null) {
                    // handle
                    engine.cursor = this.keyboardStatus.isAlt ? Cursor.PointerRemoveAlt : Cursor.PointerPointAlt;
                } else {
                    // node
                    if (this.keyboardStatus.isCtrl) {
                        engine.cursor = Cursor.PointerPointAlt;
                    } else if (!this.isWorking && this.keyboardStatus.isAlt) {
                        engine.cursor = Cursor.PointerRemoveAlt;
                    } else {
                        engine.cursor = Cursor.PointerMoveAlt;
                    }
                }
                break;
            default:
                if (this.hoverElement) {
                    if (!this.keyboardStatus.isShift && engine.selection.isSelected(this.hoverElement)) {
                        engine.cursor = Cursor.PointerMoveAlt;
                    } else {
                        engine.cursor = Cursor.PointerSelectableAlt;
                    }
                } else {
                    engine.cursor = this.defaultCanvasCursor;
                }
                break;
        }
    }

    protected restoreAction(engine: CanvasEngine, position: Point, invalidate?: boolean) {
        let invalidateTool: boolean = false;
        const active = engine.selection.activeElement;

        const prevAction = this.action;
        const prevHovered = this.hoverElement;

        if (active) {
            // check origin
            if (this.utils.isOverOrigin(active, position)) {
                this.action = Action.Origin;
                this.hoverElement = active;
                this.boxHandlePosition = null;
                this.hoverMotion = null;
            } else {
                // check handle
                const handle = this.utils.getBoxHandle(active.globalBounds, position, true);
                if (handle) {
                    if (!this.boxHandlePosition || this.boxHandlePosition.x !== handle.x || this.boxHandlePosition.y !== handle.y) {
                        invalidateTool = true;
                    }
                    this.action = (handle.x === Position.Middle && handle.y === Position.Middle) ? Action.Move : Action.Scale;
                    this.boxHandlePosition = handle;
                    this.hoverElement = active;
                    this.hoverMotion = null;
                } else {
                    // check rotate
                    const rotatePoint = this.utils.getRotatePoint(active, position);
                    if (rotatePoint) {
                        this.action = Action.Rotate;
                        this.hoverElement = active;
                        this.boxHandlePosition = null;
                        this.hoverMotion = null;
                    } else {
                        this.hoverElement = null;
                        this.boxHandlePosition = null;

                        // check motion
                        const wasMotion = this.hoverMotion != null;

                        if (this.utils.motionElement && this.utils.motionElement === active) {
                            this.hoverMotion = this.utils.getMotionPathInfo(position);
                        } else {
                            this.hoverMotion = null;
                        }
                        if (this.hoverMotion) {
                            this.action = Action.Motion;
                            this.hoverElement = active;
                        } else {
                            if (wasMotion) {
                                invalidateTool = true;
                            }

                            this.hoverElement = this.utils.getHoveredElement(engine, position);
                            if (this.hoverElement && engine.selection.isSelected(this.hoverElement)) {
                                this.action = Action.Move;
                            } else {
                                this.action = Action.None;
                            }
                        }
                    }
                }
            }
        } else {
            this.hoverElement = this.utils.getHoveredElement(engine, position);
            this.action = this.hoverElement && engine.selection.isSelected(this.hoverElement) ? Action.Move : Action.None;
            this.boxHandlePosition = null;
            this.hoverMotion = null;
        }

        if (this.action !== prevAction || this.hoverElement !== prevHovered) {
            invalidateTool = true;
        }

        if (invalidate) {
            this.invalidate();
        } else if (invalidateTool) {
            this.invalidateToolDrawing();
        }
    }

    protected drawTool(engine: CanvasEngine): void {
        if (this.selectionStart != null) {
            this.utils.drawSelectionAreaRectangle(engine, this.selectionStart, this.selectionEnd);
            return;
        }

        const selection = engine.selection;

        const context = engine.context;
        context.save();
        context.setViewBox(engine.viewBox);
        this.utils.setScale(engine);

        // Draw outline
        if (!this.isWorking && this.hoverElement && !selection.isSelected(this.hoverElement)) {
            this.utils.drawElementOutline(context, this.hoverElement);
        }

        if (selection.isEmpty) {
            context.restore();
            return;
        }

        const isRotating = this.rotatePivot != null;

        // Draw wrapper
        if (!isRotating) {
            this.utils.drawSelectionWrapper(context, selection.boundingBox);
        }

        const active = selection.activeElement;

        // Draw other elements bbox, without handles
        if (selection.length > 1) {
            for (const element of selection) {
                if (element !== active) {
                    this.utils.drawElementBoundingBox(context, element);
                }
            }
        }

        // Draw motion path
        this.utils.drawMotionPath(context, active, (engine.project as AnimationProject).keyframeSelection);

        if (isRotating) {
            // Draw active element bbox without handles
            this.utils.drawElementBoundingBox(context, active, false);
            // Draw rotate angle
            // this.utils.drawRotateAngle(context,
            //     this.rotatePivot,
            //     this.rotateSign * this.rotateAngleStart,
            //     this.rotateSign * this.rotateAngleCurrent,
            //     this.position
            // );
            context.drawLine(this.rotatePivot, this.position, this.utils.getPen('transform-origin'));
        } else {
            // Draw active element bbox with handles
            this.utils.drawElementBoundingBox(context, active, true);
            // Draw rotate points
            this.utils.drawRotatePoints(context, active);
        }

        // Draw origin
        this.utils.drawOrigin(context, active);

        context.restore();
    }

    changeJointType(joint: PathJoint): boolean {
        if (this.utils.selectedNodes.size === 0) {
            return false;
        }
        const animation = this.utils.motionAnimation;
        if (animation == null) {
            return false;
        }

        let changed: boolean = false;

        for (const index of this.utils.selectedNodes) {
            const keyframe = animation.keyframes[index];
            if (!keyframe || keyframe.value.joint === joint) {
                continue;
            }
            keyframe.value = keyframe.value.withJoint(joint);
            changed = true;
        }

        return changed;
    }

    onKeyboardStatusChange(engine: CanvasEngine, event: KeyboardEvent) {
        if (this.isWorking) {
            return;
        }

        if (this.hoverElement && engine.keyboardStatus.eventKeyIsCtrl(event)) {
            this.restoreAction(engine, engine.currentDocumentPosition);
            this.refreshCursor(engine);
            return;
        }

        if (this.hoverMotion || (this.hoverElement && event.key === 'Shift')) {
            this.refreshCursor(engine);
        }
    }

    onMouseHover(engine: CanvasEngine, event: ToolMouseEvent) {
        this.restoreAction(engine, event.position);
    }

    protected doMouseMove: (engine: CanvasEngine, event: ToolMouseEvent) => void = null;
    protected doMouseUp: (engine: CanvasEngine, event: ToolMouseEvent) => void = null;

    onMouseLeftButtonDown(engine: CanvasEngine, event: ToolMouseEvent) {
        this.isWorking = true;
        this.changed = false;
        this.firstOriginMove = true;

        // Handle origin
        if (this.action === Action.Origin) {
            return this.onOriginStart(engine, event);
        }

        // Handle scale
        if (this.action === Action.Scale) {
            return this.onScaleStart(engine, event);
        }

        // Handle move
        if (this.action === Action.Move) {
            return this.onMoveStart(engine, event);
        }

        // Handle rotate
        if (this.action === Action.Rotate) {
            return this.onRotateStart(engine, event);
        }

        // Handle motion path
        if (this.action === Action.Motion) {
            return this.onMotionStart(engine, event);
        }

        // Handle selection or element move
        if (this.hoverElement) {
            const selection = engine.selection;
            if (selection.selectOrDeselect(this.hoverElement, this.keyboardStatus.isShift)) {
                engine.emit(ProjectEvent.selectionChanged);
                this.invalidateToolDrawing();
            }

            if (selection.activeElement === this.hoverElement) {
                this.action = Action.Move;
                this.refreshCursor(engine);
                return this.onMoveStart(engine, event);
            }

            return;
        }

        // Handle rectangle selection
        this.action = Action.RectangleSelection;
        this.selectionStart = event.position;
        this.selectionEnd = null;
        if (engine.selection.clear()) {
            engine.emit(ProjectEvent.selectionChanged);
        }
        this.invalidateToolDrawing();
    }

    onMouseLeftButtonMove(engine: CanvasEngine, event: ToolMouseEvent) {
        if (this.doMouseMove) {
            return this.doMouseMove(engine, event);
        }
        // Handle rectangle selection
        if (this.selectionStart != null) {
            this.selectionEnd = event.position;
            this.invalidateToolDrawing();
        }
    }

    onMouseLeftButtonUp(engine: CanvasEngine, event: ToolMouseEvent) {
        if (this.doMouseUp) {
            this.doMouseUp(engine, event);
        } else if (this.selectionStart) {
            const selection = engine.selection;
            if (selection.rectSelect(
                Rectangle.fromTransformedPoints(engine.document.globalMatrix, this.selectionStart, event.position),
                engine.document,
                this.keyboardStatus.isCtrl
            )) {
                engine.emit(ProjectEvent.selectionChanged);
            }
            this.hoverMotion = null;
            this.selectionStart = this.selectionEnd = null;
            this.invalidateToolDrawing();
        }

        this.originAngleReference = null;
        this.firstOriginMove = false;
        this.position = null;
        this.changed = false;
        this.isWorking = false;
        this.doMouseMove = null;
        this.doMouseUp = null;

        this.removeSnapping();
        this.restoreAction(engine, event.position);
        this.refreshCursor(engine);
    }

    /** Origin **/

    private origin: Point = null;
    private firstOriginMove: boolean = false;
    private originAngleReference: Point = null;

    protected onOriginStart(engine: CanvasEngine, event: ToolMouseEvent): void {
        const active = engine.selection.activeElement;
        this.origin = active.position;
        this.originAngleReference = this.origin;
        this.position = event.position;

        const matrix = this.utils.getParentGlobalMatrix(active);
        if (matrix) {
            this.position = matrix.transformPoint(this.position);
            this.originAngleReference = matrix.transformPoint(this.originAngleReference);
        }

        this.snapping.init(engine);
        this.keyframeCounter.start(engine);

        this.doMouseMove = this.onOrigin;
        this.doMouseUp = this.onOriginEnd;
    }

    protected selectAddedOriginKeyframe(engine: CanvasEngine): void {
        const motion = this.utils.motionAnimation;
        if (!motion) {
            return;
        }
        const project = engine.project as AnimationProject;
        const keyframe = motion.getKeyframeAtOffset(project.time);
        if (!keyframe) {
            return;
        }
        if (project.keyframeSelection.selectKeyframe(keyframe, false)) {
            this.notifyKeyframeSelectionChanged();
        }
    }

    protected onOrigin(engine: CanvasEngine, event: ToolMouseEvent): void {
        const origin = engine.keyboardStatus.isShift
                        ? this.snapping.snapPointAxis(event.position, this.originAngleReference)
                        : this.snapping.snapPoint(event.position);
        const active = engine.selection.activeElement;
        const matrix = this.utils.getParentGlobalMatrix(active);
        const delta = origin.sub(matrix ? matrix.transformPoint(active.position) : active.position);

        if (!delta.isZero && engine.project.middleware.moveOriginBy(engine.selection, delta)) {
            this.changed = true;
            if (this.firstOriginMove) {
                this.firstOriginMove = false;
                this.selectAddedOriginKeyframe(engine);
            }
            this.invalidate();
            engine.emit(ProjectEvent.propertyChanged);
        }
    }

    protected onOriginEnd(engine: CanvasEngine): void {
        this.snapshotIfNeeded(engine, !this.origin.equals(engine.selection.activeElement.position));
        this.origin = null;
    }

    /** Motion path **/

    protected updateMotionPath(engine: CanvasEngine): void {
        if (!this.utils.updateMotionPathElement(engine)) {
            this.invalidateToolDrawing();
        }
    }

    protected getKeyframeSelection(engine: CanvasEngine): KeyframeSelection {
        return (engine.project as AnimationProject).keyframeSelection;
    }

    protected selectedKeyframes: Keyframe<PathNode>[] = null;
    protected motionMatrix: Matrix = null;
    protected snapToAngleOrigin: Point = null;
    protected handleToMove: HandleType = null;
    protected moldFunc: PathMoldingFunction = null;

    protected onMotionStart(engine: CanvasEngine, event: ToolMouseEvent): void {
        const hover = this.hoverMotion;
        const motion = this.utils.motionAnimation;
        if (!hover || !motion || !motion.keyframes[hover.index]) {
            return;
        }

        // here we don't need keyframe counter because we are working on keyframes
        this.doMouseUp = this.onMotionEnd;
        this.motionMatrix = this.utils.getParentGlobalMatrix(this.utils.motionElement);

        let keyframe = motion.keyframes[hover.index];

        if (hover.percent != null) {
            if (this.keyboardStatus.isAlt) {
                const offset = Math.round(keyframe.offset + hover.percent * (motion.keyframes[hover.index + 1].offset - keyframe.offset));
                if (motion.getKeyframeAtOffset(offset)) {
                    // there already is a keyframe
                    return;
                }

                const selection = this.getKeyframeSelection(engine);
                selection.clear();
                this.selectedKeyframes = [motion.addKeyframeAtOffset(offset)];
                selection.selectKeyframe(this.selectedKeyframes[0]);

                this.updateMotionPath(engine);
                this.notifyKeyframeSelectionChanged();

                this.changed = true;

                hover.handle = null;
                hover.percent = null;
                hover.index++;
                keyframe = motion.keyframes[hover.index];
                hover.node = keyframe.value;
                this.refreshCursor(engine);

                this.position = keyframe.value.point;
                this.nodeReference = this.motionMatrix
                    ? this.motionMatrix.transformPoint(this.position)
                    : this.position;

                this.snapping.init(engine);
                this.addExtraSnappingPointsFromMotion(this.utils.motionElement, motion, this.motionMatrix);

                this.doMouseMove = this.onMotionNodeMove;
            } else {
                const kf = [keyframe, motion.keyframes[hover.index + 1]];
                this.selectedKeyframes = kf;

                const nodes = Path.ensurePairHasHandles([kf[0].value, kf[1].value], 0, 1, hover.percent, this.keyboardStatus.isCtrl);

                if (kf[0].value !== nodes[0]) {
                    kf[0].value = nodes[0];
                    this.changed = true;
                }
                if (kf[1].value !== nodes[1]) {
                    kf[1].value = nodes[1];
                    this.changed = true;
                }

                const selection = this.getKeyframeSelection(engine);
                if (selection.selectMultipleKeyframes(kf, false)) {
                    this.notifyKeyframeSelectionChanged();
                }

                if (this.changed) {
                    this.updateMotionPath(engine);
                }

                this.moldFunc = Path.createMoldingFunction(nodes, 0, 1, hover.percent);

                this.doMouseMove = this.onMotionMold;
            }
        } else if (hover.handle != null) {
            if (this.keyboardStatus.isAlt) {
                keyframe.value = keyframe.value.withoutHandle(hover.handle);
                this.updateMotionPath(engine);
                this.changed = true;
            } else {
                if (this.keyboardStatus.isCtrl && keyframe.value.joint !== PathJoint.Symmetric) {
                    keyframe.value = keyframe.value.withJoint(PathJoint.Symmetric);
                    this.changed = true;
                    this.updateMotionPath(engine);
                }

                this.selectedKeyframes = [keyframe];
                this.handleToMove = hover.handle;
                this.position = keyframe.value.getHandle(hover.handle);
                this.snapToAngleOrigin = keyframe.value.point;

                if (this.motionMatrix) {
                    this.snapToAngleOrigin = this.motionMatrix.transformPoint(this.snapToAngleOrigin);
                }

                this.snapping.init(engine);
                this.addExtraSnappingPointsFromMotion(this.utils.motionElement, motion, this.motionMatrix);
                this.doMouseMove = this.onMotionHandleMove;
            }
        } else {
            if (this.keyboardStatus.isCtrl) {
                const selection = this.getKeyframeSelection(engine);
                if (selection.selectKeyframe(keyframe)) {
                    this.notifyKeyframeSelectionChanged();
                    this.utils.updateKeyframeSelection(selection);
                }

                let node = keyframe.value;
                if (node.joint === PathJoint.Corner) {
                    node = new PathNode(node.point, node.type, PathJoint.Symmetric, node.point, node.point);
                } else if (node.joint !== PathJoint.Symmetric || !node.usesBothHandles) {
                    node = new PathNode(node.point, node.type, PathJoint.Symmetric, node.handleIn || node.point, node.handleOut || node.point);
                }

                if (node !== keyframe.value) {
                    keyframe.value = node;
                    this.changed = true;
                    this.updateMotionPath(engine);
                }

                this.selectedKeyframes = [keyframe];
                this.handleToMove = HandleType.Out;
                this.position = node.handleOut;
                this.snapToAngleOrigin = node.point;

                if (this.motionMatrix) {
                    this.snapToAngleOrigin = this.motionMatrix.transformPoint(this.snapToAngleOrigin);
                }

                this.snapping.init(engine);
                this.addExtraSnappingPointsFromMotion(this.utils.motionElement, motion, this.motionMatrix);
                this.doMouseMove = this.onMotionHandleMove;
            } else if (this.keyboardStatus.isAlt) {
                if (this.getKeyframeSelection(engine).deselectKeyframe(keyframe)) {
                    this.notifyKeyframeSelectionChanged();
                }
                if (motion.removeKeyframe(keyframe)) {
                    this.changed = true;
                    this.updateMotionPath(engine);
                }
            } else {
                const selection = this.getKeyframeSelection(engine);

                let updateSelection: boolean;

                if (this.keyboardStatus.isShift && selection.isKeyframeSelected(keyframe)) {
                    updateSelection = selection.deselectKeyframe(keyframe);
                } else {
                    updateSelection = selection.selectKeyframe(keyframe, this.keyboardStatus.isShift);
                }

                if (updateSelection) {
                    this.utils.updateKeyframeSelection(selection);
                    this.notifyKeyframeSelectionChanged();
                }

                if (!selection.isKeyframeSelected(keyframe)) {
                    // keyframe was deselected
                    return;
                }

                this.selectedKeyframes = this.utils.selectedKeyframes;
                if (!this.selectedKeyframes || !this.selectedKeyframes.length) {
                    // nothing?
                    return;
                }

                this.snapToAngleOrigin = null;

                const length = motion.keyframes.length;
                if (this.selectedKeyframes.length === 1 && length > 1) {
                    if (hover.index === 0) {
                        this.snapToAngleOrigin = motion.keyframes[hover.index + 1].value.point;
                    } else if (hover.index === length - 1) {
                        this.snapToAngleOrigin = motion.keyframes[hover.index - 1].value.point;
                    }
                    if (this.motionMatrix && this.snapToAngleOrigin) {
                        this.snapToAngleOrigin = this.motionMatrix.transformPoint(this.snapToAngleOrigin);
                    }
                }

                this.position = keyframe.value.point;
                this.nodeReference = this.motionMatrix
                    ? this.motionMatrix.transformPoint(this.position)
                    : this.position;

                this.snapping.init(engine);
                this.addExtraSnappingPointsFromMotion(this.utils.motionElement, motion, this.motionMatrix);

                this.doMouseMove = this.onMotionNodeMove;
            }
        }
    }

    protected addExtraSnappingPointsFromMotion(element: Element, motion: MotionAnimation, matrix: Matrix | null): void {
        if (matrix) {
            this.snapping.addExtraPoints(matrix.transformPoint(element.position)); // origin
            for (const keyframe of motion.keyframes) {
                this.snapping.addExtraPoints(matrix.transformPoint(keyframe.value.point));
            }
        } else {
            this.snapping.addExtraPoints(element.position); // origin
            for (const keyframe of motion.keyframes) {
                this.snapping.addExtraPoints(keyframe.value.point);
            }
        }
    }

    protected onMotionMold(engine: CanvasEngine, event: ToolMouseEvent): void {
        const info = this.moldFunc;
        let position = event.position;
        if (this.motionMatrix) {
            position = this.motionMatrix.transformInversePoint(position);
        }

        const handles = Path.applyMoldingFunction(position, info);

        const kf = this.selectedKeyframes;

        const nodes = Path.moldNodePair(
            [kf[0].value, kf[1].value],
            0,
            1,
            handles[0],
            handles[1]
        );

        let changed: boolean = false;

        if (kf[0].value !== nodes[0]) {
            kf[0].value = nodes[0];
            changed = true;
        }

        if (kf[1].value !== nodes[1]) {
            kf[1].value = nodes[1];
            changed = true;
        }

        if (changed) {
            this.changed = true;
            this.updateMotionPath(engine);
        }
    }

    protected nodeReference: Point = null;

    protected onMotionNodeMove(engine: CanvasEngine, event: ToolMouseEvent): void {
        let position = this.keyboardStatus.isShift
            ? (this.snapToAngleOrigin
                    ? this.snapping.snapAngle(this.snapToAngleOrigin, event.position)
                    : this.snapping.snapPointAxis(event.position, this.nodeReference)
            )
            : this.snapping.snapPoint(event.position);

        if (this.motionMatrix) {
            position = this.motionMatrix.inversePoint(position.x, position.y);
        }

        if (this.position.equals(position)) {
            return;
        }

        const delta = position.sub(this.position);

        this.position = position;

        for (const keyframe of this.selectedKeyframes) {
            keyframe.value = keyframe.value.moveBy(delta.x, delta.y);
        }

        this.updateMotionPath(engine);
        this.changed = true;
    }

    protected onMotionHandleMove(engine: CanvasEngine, event: ToolMouseEvent): void {
        let position = this.keyboardStatus.isShift && this.snapToAngleOrigin
            ? this.snapping.snapAngle(this.snapToAngleOrigin, event.position)
            : this.snapping.snapPoint(event.position);

        if (this.motionMatrix) {
            position = this.motionMatrix.inversePoint(position.x, position.y);
        }

        if (this.position.equals(position)) {
            return;
        }

        this.position = position;

        this.selectedKeyframes[0].value = this.selectedKeyframes[0].value.moveHandleTo(position.x, position.y, this.handleToMove);

        this.updateMotionPath(engine);
        this.changed = true;
    }

    protected onMotionEnd(engine: CanvasEngine): void {
        this.nodeReference = null;
        this.moldFunc = null;
        this.snapToAngleOrigin = null;
        this.motionMatrix = null;
        this.selectedKeyframes = null;
        this.handleToMove = null;
        if (this.changed) {
            engine.project.state.snapshot();
        }
    }

    /** Move **/

    protected totalMoveDelta: Point = null;
    protected box: Rectangle = null;

    protected onMoveStart(engine: CanvasEngine, event: ToolMouseEvent): void {
        this.snapping.init(engine, engine.selection);
        this.keyframeCounter.start(engine);

        this.box = engine.selection.boundingBox;
        this.totalMoveDelta = Point.ZERO;

        this.doMouseMove = this.onMove;
        this.doMouseUp = this.onMoveEnd;
    }

    protected onMove(engine: CanvasEngine, event: ToolMouseEvent): void {
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

        const isAnchor = this.keyboardStatus.isAlt;

        // Handle move
        if (engine.project.middleware.moveElementsBy(engine.selection, delta, isAnchor)) {
            if (!isAnchor && this.firstOriginMove) {
                this.firstOriginMove = false;
                this.selectAddedOriginKeyframe(engine);
            }
            this.changed = true;
            this.invalidate();
            engine.emit(ProjectEvent.propertyChanged);
        }
    }

    protected onMoveEnd(engine: CanvasEngine): void {
        this.snapshotIfNeeded(engine, this.changed);
        this.box = null;
        this.totalMoveDelta = null;
        this.position = null;
    }


    /** Scale **/
    private boxHandlePosition: AxisPointPosition | null = null;
    private boxHandleStart: Point | null = null;

    protected onScaleStart(engine: CanvasEngine, event: ToolMouseEvent): void {
        if (this.boxHandlePosition == null) {
            // we need box handle position
            return;
        }
        const active = engine.selection.activeElement;
        this.boxHandleStart = active.scale;
        this.position = active.globalBounds.getPointAtPosition(this.boxHandlePosition.x, this.boxHandlePosition.y);
        this.snapping.init(engine, engine.selection);
        this.keyframeCounter.start(engine);

        this.doMouseMove = this.onScale;
        this.doMouseUp = this.onScaleEnd;
    }

    protected onScale(engine: CanvasEngine, event: ToolMouseEvent): void {
        const factor = engine.project.middleware.getScaleFactor(
            engine.selection.activeElement,
            this.boxHandlePosition,
            this.snapping.snapPoint(event.position),
            this.keyboardStatus.isShift
        );

        if (engine.project.middleware.scaleElementsByFactor(engine.selection, factor)) {
            this.changed = true;
            this.invalidate();
            engine.emit(ProjectEvent.propertyChanged);
        }
    }

    protected onScaleEnd(engine: CanvasEngine): void {
        this.snapshotIfNeeded(engine, !this.boxHandleStart.equals(engine.selection.activeElement.scale));
        this.boxHandleStart = null;
        this.boxHandlePosition = null;
    }

    /** Rotate **/

    private rotatePivot: Point = null;
    private rotateAngleDelta: number = 0;
    private rotateAngleStart: number = 0;
    private rotateAngleCurrent: number = 0;
    private rotateSign: number = 1;
    private rotateStart: number = 0;

    protected onRotateStart(engine: CanvasEngine, event: ToolMouseEvent): void {
        const active = engine.selection.activeElement;

        this.rotateSign = Math.sign(active.globalMatrix.a * active.globalMatrix.d * active.localMatrix.a * active.localMatrix.d) || 1;

        const matrix = this.utils.getParentGlobalMatrix(active);
        this.rotatePivot = matrix ? matrix.transformPoint(active.position) : active.position;

        this.rotateStart = active.totalRotate;
        this.rotateAngleDelta = 0;
        this.rotateAngleStart = this.rotatePivot.getPositiveAngleTo(event.position);
        this.rotateAngleCurrent = this.rotateAngleStart;
        this.keyframeCounter.start(engine);

        this.snapping.init(engine, engine.selection);
        this.doMouseMove = this.onRotate;
        this.doMouseUp = this.onRotateEnd;
    }

    protected onRotate(engine: CanvasEngine, event: ToolMouseEvent): void {
        let position = event.position;
        if (this.keyboardStatus.isShift) {
            position = this.snapping.snapAngle(this.rotatePivot, event.position);
        } else {
            position = this.snapping.snapPoint(position);
        }

        let a = this.rotatePivot.getPositiveAngleTo(position);
        let b = this.rotateAngleCurrent;

        let delta = a - b;
        if (delta < -180) {
            delta = 360 + delta;
        } else if (delta > 180) {
            delta = 360 - delta;
        }

        delta = Math.round(delta);
        delta *= this.rotateSign;

        if (engine.project.middleware.rotateElementsBy(engine.selection, delta)) {
            this.position = position;
            this.rotateAngleCurrent = a;
            this.changed = true;
            this.invalidate();
            engine.emit(ProjectEvent.propertyChanged);
        }
    }

    protected onRotateEnd(engine: CanvasEngine, event: ToolMouseEvent): void {
        this.snapshotIfNeeded(engine, this.rotateStart !== engine.selection.activeElement.totalRotate);
        this.rotatePivot = null;
    }

    /**
     * Create a snapshot if something has changed
     */
    protected snapshotIfNeeded(engine: CanvasEngine, changed?: boolean): void {
        if (changed || this.keyframeCounter.hasChanged(engine)) {
            engine.project.state.snapshot();
        }
    }

    /** Wheel **/

    onMouseWheel(engine: CanvasEngine, event: ToolMouseEvent) {
        super.onMouseWheel(engine, event);
        if (!this.isWorking) {
            this.restoreAction(engine, event.position);
        }
    }

    onMouseWheelButtonDown(engine: CanvasEngine, event: ToolMouseEvent) {
        super.onMouseWheelButtonDown(engine, event);
        this.action = Action.Pan;
        this.refreshCursor(engine);
    }

    onMouseWheelButtonUp(engine: CanvasEngine, event: ToolMouseEvent) {
        super.onMouseWheelButtonUp(engine, event);
        this.restoreAction(engine, event.position);
    }
}