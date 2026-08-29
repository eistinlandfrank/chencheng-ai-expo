import { ACTIVE_BOOTHS as BOOTHS } from "./DATA_SOURCE";

// 2D expo floor plan geometry (SVG viewBox 360 x 520).
// 6 columns x 5 rows of booths, corridors between rows/cols.
export const MAP_W = 360;
export const MAP_H = 520;

const COLS = 6;
const ROWS = 5;
const PAD_X = 24;
const PAD_TOP = 40;
const CELL_W = 46;
const CELL_H = 62;
const GAP_X = (MAP_W - PAD_X * 2 - COLS * CELL_W) / (COLS - 1);
const GAP_Y = 46;

export interface Cell {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export const CELLS: Cell[] = BOOTHS.map((b) => {
  const x = PAD_X + b.gx * (CELL_W + GAP_X);
  const y = PAD_TOP + b.gy * (CELL_H + GAP_Y);
  return { id: b.id, x, y, w: CELL_W, h: CELL_H, cx: x + CELL_W / 2, cy: y + CELL_H / 2 };
}).filter((_, i) => i < COLS * ROWS);

export function getCell(id: string): Cell | undefined {
  return CELLS.find((c) => c.id === id);
}

// Corridor nodes: horizontal aisle centre of each row, plus a vertical spine.
interface Node {
  id: string;
  x: number;
  y: number;
}
const SPINE_X = MAP_W / 2;

const rowAisleY = (row: number) =>
  PAD_TOP + row * (CELL_H + GAP_Y) + CELL_H + GAP_Y / 2;

const nodes: Node[] = [];
for (let r = 0; r < ROWS; r++) {
  nodes.push({ id: `A${r}`, x: SPINE_X, y: rowAisleY(r) });
}
export const CORRIDOR_NODES = nodes;

// Path between two booths: booth -> its row aisle -> spine down/up -> target row aisle -> target booth.
export interface RoutePoint {
  x: number;
  y: number;
}

export function computeRoute(fromId: string, toId: string): RoutePoint[] {
  const a = getCell(fromId);
  const b = getCell(toId);
  if (!a || !b) return [];
  const rowA = Math.round((a.y - PAD_TOP) / (CELL_H + GAP_Y));
  const rowB = Math.round((b.y - PAD_TOP) / (CELL_H + GAP_Y));
  const aisleA = rowAisleY(Math.min(rowA, ROWS - 1));
  const aisleB = rowAisleY(Math.min(rowB, ROWS - 1));
  const pts: RoutePoint[] = [];
  pts.push({ x: a.cx, y: a.cy });
  pts.push({ x: a.cx, y: aisleA }); // down to own aisle
  pts.push({ x: SPINE_X, y: aisleA }); // to spine
  if (rowA !== rowB) pts.push({ x: SPINE_X, y: aisleB }); // spine to target row
  pts.push({ x: b.cx, y: aisleB }); // along target aisle
  pts.push({ x: b.cx, y: b.cy }); // up into target booth
  return pts;
}

export function routeLength(pts: RoutePoint[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return d;
}

// SVG viewBox px -> real metres (demo scale).
export function estimateMeters(pts: RoutePoint[]): number {
  return Math.round(routeLength(pts) * 0.55);
}

export function estimateMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 70));
}

export function svgPath(pts: RoutePoint[]): string {
  if (pts.length === 0) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
}
