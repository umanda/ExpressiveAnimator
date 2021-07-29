import {
    Color,
    DefaultPen,
    FillRule,
    GroupElement,
    LinearGradientBrush,
    StopColorList,
    Point,
    RectElement,
    RectShape,
    RegularPolygonElement,
    RegularPolygonShape,
    Size,
    SolidBrush,
    StarElement,
    StarShape,
    StrokeLineCap,
} from "@zindex/canvas-engine";

import {AnimationDocument, AnimationProject, AnimatorSource, DocumentAnimation, NativeAnimationImporter} from "./Core";

export async function getSampleProject(): Promise<AnimationProject> {
    const sample = document.querySelector('meta[name="expressive:sample-project"]');

    if (!sample) {
        return defaultSampleProject();
    }

    const importer = new NativeAnimationImporter();
    const stream = (await (await fetch(sample.getAttribute('content'))).blob()).stream();
    const project = await importer.import(stream);
    importer.dispose();
    return project;
}

function defaultSampleProject(): AnimationProject {
    const animators = new AnimatorSource();
    const project = new AnimationProject(animators);

    const doc = new AnimationDocument(new Size(1200, 800));
    doc.title = 'Main document';
    doc.animation = new DocumentAnimation(doc, 0, 10000);

    const rect = new RectElement(new RectShape(100, 100), doc);
    rect.title = 'Rect 1';
    rect.fill = new LinearGradientBrush(new Point(0, 0), new Point(100, 0), new StopColorList([
        {
            offset: 0,
            color: Color.parse('red')
        },
        {
            offset: 0.5,
            color: Color.parse('yellow')
        },
        {
            offset: 1,
            color: Color.parse('blue')
        }
    ]));
    rect.stroke = new DefaultPen(
        new SolidBrush(Color.parse('blue')),
        5
    );
    doc.appendChild(rect);

    const a1 = animators.createAnimation(rect, "position");
    a1.addKeyframeAtOffset(0, new Point(0, 0));
    a1.addKeyframeAtOffset(2000, new Point(100, 0));
    //a1.addKeyframeAtOffset(5000, new Point(500, 0));
    doc.animation.addAnimation(rect, "position", a1);

    const as1 = animators.createAnimation(rect, "strokeLineWidth");
    as1.addKeyframeAtOffset(0, 10);
    as1.addKeyframeAtOffset(2000, 20);
    //as1.addKeyframeAtOffset(4000, 30);
    doc.animation.addAnimation(rect, "strokeLineWidth", as1);

    const rect2 = new RectElement(new RectShape(300, 300), doc);
    rect2.title = 'Rect 2';
    rect2.fill = new SolidBrush(Color.parse('yellow'));
    rect2.stroke = new DefaultPen(
        new SolidBrush(Color.parse('red')),
        3
    );
    rect2.strokeDashArray = [1200];
    rect2.strokeLineWidth = 10;
    rect2.strokeLineCap = StrokeLineCap.Square;

    const a2 = animators.createAnimation(rect2, "position");
    a2.addKeyframeAtOffset(1000, new Point(0, 300));
    a2.addKeyframeAtOffset(3000, new Point(400, 500));
    a2.addKeyframeAtOffset(5000, new Point(800, 700));
    doc.animation.addAnimation(rect2, "position", a2);

    const dashAnim = animators.createAnimation(rect2, "strokeDashOffset");
    dashAnim.addKeyframeAtOffset(0, -1200);
    dashAnim.addKeyframeAtOffset(3000, 1200);
    doc.animation.addAnimation(rect2, "strokeDashOffset", dashAnim);

    const g1 = new GroupElement(doc, 'test-group');
    g1.title = 'Group 1';
    g1.appendChild(rect2);
    doc.appendChild(g1);

    const rpoly1 = new RegularPolygonElement(new RegularPolygonShape(5, 100, 0, 0), doc);
    rpoly1.position = new Point(300, 100);
    rpoly1.strokeBrush = SolidBrush.fromColor('#ff00f2');
    rpoly1.strokeLineWidth = 5;
    doc.appendChild(rpoly1);

    const fColor = animators.createAnimation(rpoly1, "fill");
    fColor.addKeyframeAtOffset(0, SolidBrush.fromColor('#a79cff'));
    fColor.addKeyframeAtOffset(2000, SolidBrush.fromColor('#18f57f'));
    doc.animation.addAnimation(rpoly1, "fill", fColor);

    const star1 = new StarElement(new StarShape(5, 100,40), doc);
    star1.position = new Point(600, 300);
    star1.fill = SolidBrush.fromColor("#11ccd6");
    star1.fillRule = FillRule.EvenOdd;
    star1.strokeLineWidth = 0;

    star1.sides = 8;
    star1.outerRadius = 120;
    star1.innerRadius = 20;
    star1.outerCornerRadius = 0.9;
    star1.innerCornerRadius = 5;
    doc.appendChild(star1);

    const star1Anim = animators.createAnimation(star1, "outerRotate");
    star1Anim.addKeyframeAtOffset(0, 70);
    star1Anim.addKeyframeAtOffset(2000, 360 + 70);
    doc.animation.addAnimation(star1, "outerRotate", star1Anim);

    project.addDocument(doc);

    project.isRecording = false;
    project.masterDocument = doc;

    return project;
}