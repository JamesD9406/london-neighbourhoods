// Lucide icons (ISC licence), inlined at build time so they work offline with no icon font.
import { BookOpen, Coffee, IdCard, Maximize2, Minus, Plus, Trees, X } from 'lucide-static';
import type { Kind } from './data';

/** The inside of a Lucide <svg>: its paths, ready to drop into another SVG. */
const inner = (svg: string) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();

export const KIND_ICON: Partial<Record<Kind, string>> = {
  library: inner(BookOpen),
  serviceontario: inner(IdCard),
  park: inner(Trees),
  cafe: inner(Coffee),
};

/** A full Lucide <svg> for buttons, sized by CSS. */
const ui = (svg: string) => svg.replace(/\s(width|height)="24"/g, '').replace('<svg', '<svg aria-hidden="true" focusable="false"');
export const UI_ICON = { plus: ui(Plus), minus: ui(Minus), reset: ui(Maximize2), close: ui(X) };
