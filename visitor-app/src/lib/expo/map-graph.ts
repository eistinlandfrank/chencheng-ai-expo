// Coding-area geometry confirmed by the event owner: 5 columns × 15 rows =
// 75 numbered positions. Every position is a long group made from three
// compact tables sharing one number, for 225 physical tables in total.

export const CODING_COLUMNS = 5;
export const CODING_ROWS = 15;
export const TABLES_PER_POSITION = 3;
export const CODING_POSITION_COUNT = CODING_COLUMNS * CODING_ROWS;
export const CODING_TABLE_COUNT = CODING_POSITION_COUNT * TABLES_PER_POSITION;

const VENUE_WIDTH_METERS = 33.155;
const VENUE_HEIGHT_METERS = 62;
const SVG_SCALE = 9;
const SVG_ORIGIN_X = 75;
const SVG_ORIGIN_Y = 42;

export const MAP_W = 410;
export const MAP_H = 640;

export type CodingZone = "hardware" | "aigc" | "game" | "software";

export const CODING_ZONE_META: Record<
  CodingZone,
  {
    label: string;
    shortLabel: string;
    fill: string;
    stroke: string;
    description: string;
  }
> = {
  hardware: {
    label: "硬件评分区",
    shortLabel: "硬件",
    fill: "#dff6f8",
    stroke: "#12a9c9",
    description: "第 1 列全区，以及第 2 列前 10 行。",
  },
  aigc: {
    label: "AIGC 评分区",
    shortLabel: "AIGC",
    fill: "#edf8df",
    stroke: "#78bc34",
    description: "第 2 列第 11–15 行。",
  },
  game: {
    label: "游戏评分区",
    shortLabel: "游戏",
    fill: "#fff0e4",
    stroke: "#f57c28",
    description: "第 3 列全区。",
  },
  software: {
    label: "软件评分区",
    shortLabel: "软件",
    fill: "#e7eefb",
    stroke: "#4775cc",
    description: "第 4–5 列全区。",
  },
};

function zoneFor(row: number, column: number): CodingZone {
  if (column === 0) return "hardware";
  if (column === 1) return row < 10 ? "hardware" : "aigc";
  if (column === 2) return "game";
  return "software";
}

// Each numbered group uses the 3.6 m × 2.8 m footprint marked in the drawing.
// Its 3.6 m side is split into three compact tables in the rendered map.
const POSITION_WIDTH_METERS = 3.6;
const POSITION_HEIGHT_METERS = 2.8;
const POSITION_START_X_METERS = 3.46;
const POSITION_COLUMN_GAPS_METERS = [3.855, 1.5, 2.4, 1.5];

// Fit the confirmed 15 rows into the drawing's 62 m Coding-area length while
// preserving 2.4 m main evacuation aisles after rows 5 and 10.
const POSITION_START_Y_METERS = 2.43;
const POSITION_END_Y_METERS = 2.43;
const MAIN_ROW_GAP_METERS = 2.4;
const NORMAL_ROW_GAP_METERS =
  (VENUE_HEIGHT_METERS -
    POSITION_START_Y_METERS -
    POSITION_END_Y_METERS -
    CODING_ROWS * POSITION_HEIGHT_METERS -
    2 * MAIN_ROW_GAP_METERS) /
  (CODING_ROWS - 3);
const POSITION_ROW_GAPS_METERS = Array.from(
  { length: CODING_ROWS - 1 },
  (_, index) =>
    index === 4 || index === 9 ? MAIN_ROW_GAP_METERS : NORMAL_ROW_GAP_METERS,
);

function buildCenters(start: number, size: number, gaps: number[]) {
  const centers = [start + size / 2];
  for (const gap of gaps) {
    centers.push(centers[centers.length - 1] + size + gap);
  }
  return centers;
}

const COLUMN_CENTERS = buildCenters(
  POSITION_START_X_METERS,
  POSITION_WIDTH_METERS,
  POSITION_COLUMN_GAPS_METERS,
);
const ROW_CENTERS = buildCenters(
  POSITION_START_Y_METERS,
  POSITION_HEIGHT_METERS,
  POSITION_ROW_GAPS_METERS,
);

function buildAisles(centers: number[], size: number, total: number) {
  const aisles = [(centers[0] - size / 2) / 2];
  for (let index = 0; index < centers.length - 1; index += 1) {
    const currentEnd = centers[index] + size / 2;
    const nextStart = centers[index + 1] - size / 2;
    aisles.push((currentEnd + nextStart) / 2);
  }
  aisles.push((centers[centers.length - 1] + size / 2 + total) / 2);
  return aisles;
}

const VERTICAL_AISLES = buildAisles(
  COLUMN_CENTERS,
  POSITION_WIDTH_METERS,
  VENUE_WIDTH_METERS,
);
const HORIZONTAL_AISLES = buildAisles(
  ROW_CENTERS,
  POSITION_HEIGHT_METERS,
  VENUE_HEIGHT_METERS,
);

const toSvgX = (meters: number) => SVG_ORIGIN_X + meters * SVG_SCALE;
const toSvgY = (meters: number) => SVG_ORIGIN_Y + meters * SVG_SCALE;

export interface Cell {
  id: string;
  label: string;
  row: number;
  column: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  metricX: number;
  metricY: number;
  zone: CodingZone;
}

export const CELLS: Cell[] = Array.from(
  { length: CODING_POSITION_COUNT },
  (_, index) => {
    const row = Math.floor(index / CODING_COLUMNS);
    const column = index % CODING_COLUMNS;
    const id = String(index + 1).padStart(2, "0");
    const metricX = COLUMN_CENTERS[column];
    const metricY = ROW_CENTERS[row];
    const w = POSITION_WIDTH_METERS * SVG_SCALE;
    const h = POSITION_HEIGHT_METERS * SVG_SCALE;
    return {
      id,
      label: `Coding ${id}号位（3桌）`,
      row,
      column,
      x: toSvgX(metricX - POSITION_WIDTH_METERS / 2),
      y: toSvgY(metricY - POSITION_HEIGHT_METERS / 2),
      w,
      h,
      cx: toSvgX(metricX),
      cy: toSvgY(metricY),
      metricX,
      metricY,
      zone: zoneFor(row, column),
    };
  },
);

export function getCell(id: string): Cell | undefined {
  return CELLS.find((cell) => cell.id === id);
}

export const MAIN_AISLE_RECTS = [
  {
    x: toSvgX(VERTICAL_AISLES[3] - 1.2),
    y: SVG_ORIGIN_Y,
    width: 2.4 * SVG_SCALE,
    height: VENUE_HEIGHT_METERS * SVG_SCALE,
  },
  ...[5, 10].map((aisleIndex) => ({
    x: SVG_ORIGIN_X,
    y: toSvgY(HORIZONTAL_AISLES[aisleIndex] - 1.2),
    width: VENUE_WIDTH_METERS * SVG_SCALE,
    height: 2.4 * SVG_SCALE,
  })),
];

export interface RoutePoint {
  x: number;
  y: number;
}

function routeLength(points: RoutePoint[]): number {
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    distance += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    );
  }
  return distance;
}

function compactRoute(points: RoutePoint[]) {
  return points.filter(
    (point, index) =>
      index === 0 ||
      point.x !== points[index - 1].x ||
      point.y !== points[index - 1].y,
  );
}

// Evaluate all aisle choices and keep the shortest rectilinear route that
// remains in corridor space between numbered position groups.
export function computeRoute(fromId: string, toId: string): RoutePoint[] {
  const from = getCell(fromId);
  const to = getCell(toId);
  if (!from || !to) return [];
  if (from.id === to.id) return [{ x: from.metricX, y: from.metricY }];

  let shortest: RoutePoint[] = [];
  let shortestDistance = Number.POSITIVE_INFINITY;
  const fromAisles = [HORIZONTAL_AISLES[from.row], HORIZONTAL_AISLES[from.row + 1]];
  const toAisles = [HORIZONTAL_AISLES[to.row], HORIZONTAL_AISLES[to.row + 1]];

  for (const fromY of fromAisles) {
    for (const toY of toAisles) {
      for (const corridorX of VERTICAL_AISLES) {
        const candidate = compactRoute([
          { x: from.metricX, y: from.metricY },
          { x: from.metricX, y: fromY },
          { x: corridorX, y: fromY },
          { x: corridorX, y: toY },
          { x: to.metricX, y: toY },
          { x: to.metricX, y: to.metricY },
        ]);
        const distance = routeLength(candidate);
        if (distance < shortestDistance) {
          shortest = candidate;
          shortestDistance = distance;
        }
      }
    }
  }
  return shortest;
}

export function estimateMeters(points: RoutePoint[]): number {
  return Math.round(routeLength(points));
}

export function estimateMinutes(meters: number): number {
  return meters <= 0 ? 0 : Math.max(1, Math.ceil(meters / 72));
}

export function toSvgPoint(point: RoutePoint): RoutePoint {
  return { x: toSvgX(point.x), y: toSvgY(point.y) };
}

export function svgPath(points: RoutePoint[]): string {
  return points
    .map(toSvgPoint)
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
}
