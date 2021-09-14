import type {Element} from "@zindex/canvas-engine";

type ElementInfo = {
    title: string,
    icon: string
};

export const ElementInfoMap: {[type: string]: ElementInfo} = {
    rect: {
        title: 'Rectangle',
        icon: 'expr:rectangle-tool'
    },
    ellipse: {
        title: 'Ellipse',
        icon: 'expr:ellipse'
    },
    star: {
        title: 'Star',
        icon: 'expr:star-tool'
    },
    'regular-polygon': {
        title: 'Polygon',
        icon: 'expr:polygon'
    },
    poly: {
        title: 'Polyline',
        icon: 'expr:polyline-tool'
    },
    line: {
        title: 'Line',
        icon: 'expr:line-tool',
    },
    path: {
        title: 'Path',
        icon: 'expr:path'
    },
    symbol: {
        title: 'Symbol',
        icon: 'expr:symbol'
    },
    group: {
        title: 'Group',
        icon: 'workflow:Folder'
    },
    'clip-path': {
        title: 'Clip path',
        icon: 'expr:clip-path'
    },
    'mask': {
        title: 'Mask',
        icon: null, // TODO
    },
    text: {
        title: 'Text',
        icon: 'expr:text-tool'
    },
};

export function getElementTitleByType(type: string): string {
    return ElementInfoMap[type].title || ('(' + type + ')');
}

export function getElementTitle(element: Element): string {
    return element.title || ElementInfoMap[element.type].title || ('(' + element.type + ')');
}

export function getElementIcon(element: Element): string {
    return ElementInfoMap[element.type]?.icon || 'expr:unknown';
}
