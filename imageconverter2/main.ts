import { Image } from "@cross/image";
import { applyPalette, utils } from "image-q";
import { BUTTONS, delay } from "./buttons.ts";
import { COLORS, DEFAULT_COLOR, getColorIdx, selectNewColor } from "./colors.ts";

const data = await Deno.readFile(Deno.args[0]);
let image = await Image.decode(data);
if (Deno.args.length >= 3) {
  const width = parseInt(Deno.args[1]);
  const height = parseInt(Deno.args[2]);
  image = image.resize({ width, height });
}

{
  const container = utils.PointContainer.fromUint8Array(
    image.data,
    image.width,
    image.height,
  );
  const palette = new utils.Palette();
  for (const color of COLORS) palette.add(utils.Point.createByRGBA(color[0], color[1], color[2], 255));
  const result = await applyPalette(container, palette, {});
  const points = result.getPointArray();
  for (let i = 0; i < points.length; i++) {
    const x = i % image.width;
    const y = Math.floor(i / image.width);

    const orig = image.getPixel(x, y);
    if (orig && orig.a < 127) continue;

    const point = points[i];
    image.setPixel(x, y, point.r, point.g, point.b, 255);
  }
}

await Deno.writeFile("images/result.png", await image.encode("png"));

// precompute color index grid
const colorGrid: number[][] = [];
for (let y = 0; y < image.height; y++) {
  colorGrid[y] = [];
  for (let x = 0; x < image.width; x++) {
    const pixel = image.getPixel(x, y)!;
    if (pixel.a < 127) {
      colorGrid[y][x] = -1;
    } else {
      colorGrid[y][x] = getColorIdx(pixel.r, pixel.g, pixel.b);
    }
  }
}

// collect used colors, sort by pixel count (most common first)
const colorCounts = new Map<number, number>();
for (let y = 0; y < image.height; y++) {
  for (let x = 0; x < image.width; x++) {
    const c = colorGrid[y][x];
    if (c === -1) continue;
    colorCounts.set(c, (colorCounts.get(c) ?? 0) + 1);
  }
}
const colors = [...colorCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .map((e) => e[0]);

interface RowInfo {
  y: number;
  firstX: number;
  lastX: number;
}

function getRowsForColor(color: number): RowInfo[] {
  const rows: RowInfo[] = [];
  for (let y = 0; y < image.height; y++) {
    let firstX = -1;
    let lastX = -1;
    for (let x = 0; x < image.width; x++) {
      if (colorGrid[y][x] === color) {
        if (firstX === -1) firstX = x;
        lastX = x;
      }
    }
    if (firstX !== -1) rows.push({ y, firstX, lastX });
  }
  return rows;
}

const insns: number[] = [];

// emit direction presses with release frames between
function moveCursor(button: number, count: number) {
  for (let i = 0; i < count; i++) {
    insns.push(button);
    insns.push(BUTTONS.NOOP);
  }
}

function navigateTo(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  let dx = toX - fromX;
  let dy = toY - fromY;

  // diagonal movement first
  const diagSteps = Math.min(Math.abs(dx), Math.abs(dy));
  if (diagSteps > 0) {
    const hBit = dx > 0 ? BUTTONS.RIGHT : BUTTONS.LEFT;
    const vBit = dy > 0 ? BUTTONS.DOWN : BUTTONS.UP;
    moveCursor(hBit | vBit, diagSteps);
    dx += dx > 0 ? -diagSteps : diagSteps;
    dy += dy > 0 ? -diagSteps : diagSteps;
  }

  if (dx !== 0) moveCursor(dx > 0 ? BUTTONS.RIGHT : BUTTONS.LEFT, Math.abs(dx));
  if (dy !== 0) moveCursor(dy > 0 ? BUTTONS.DOWN : BUTTONS.UP, Math.abs(dy));
}

// === SETUP ===
// idle frames so Switch recognizes controller and firmware init runs
delay(insns, 80);

// wait for editor to be ready after firmware dismisses dialog
delay(insns, 160);

// set brush to 1px: X, X, LEFT, LEFT, A
insns.push(BUTTONS.X);
delay(insns, 30);
insns.push(BUTTONS.X);
delay(insns, 30);
insns.push(BUTTONS.LEFT);
delay(insns, 10);
insns.push(BUTTONS.LEFT);
delay(insns, 10);
insns.push(BUTTONS.A);
delay(insns, 30);

// B to return to canvas (cursor returns to center)
insns.push(BUTTONS.B);
delay(insns, 60);

// navigate from center to (0, 0) - exact distance, no overshoot
const halfW = Math.ceil(image.width / 2);
const halfH = Math.ceil(image.height / 2);
const diagSteps = Math.min(halfW, halfH);
moveCursor(BUTTONS.UP | BUTTONS.LEFT, diagSteps);
if (halfW > diagSteps) moveCursor(BUTTONS.LEFT, halfW - diagSteps);
if (halfH > diagSteps) moveCursor(BUTTONS.UP, halfH - diagSteps);

let cursorX = 0;
let cursorY = 0;

// === DRAWING ===
let currentColor = DEFAULT_COLOR;

console.log(`${colors.length} colors`);

for (const newColor of colors) {
  const rows = getRowsForColor(newColor);
  if (rows.length === 0) continue;

  // process rows nearest to cursor first
  const firstRowDist = Math.abs(cursorY - rows[0].y);
  const lastRowDist = Math.abs(cursorY - rows[rows.length - 1].y);
  if (lastRowDist < firstRowDist) rows.reverse();

  selectNewColor(insns, currentColor, newColor);
  currentColor = newColor;

  for (const row of rows) {
    // pick direction that minimizes navigation
    const distToFirst = Math.abs(cursorX - row.firstX);
    const distToLast = Math.abs(cursorX - row.lastX);

    let startX: number, endX: number;
    if (distToFirst <= distToLast) {
      startX = row.firstX;
      endX = row.lastX;
    } else {
      startX = row.lastX;
      endX = row.firstX;
    }

    navigateTo(cursorX, cursorY, startX, row.y);

    // draw from startX to endX
    const goingRight = startX <= endX;
    const step = goingRight ? 1 : -1;
    const dirButton = goingRight ? BUTTONS.RIGHT : BUTTONS.LEFT;
    let x = startX;
    while (true) {
      insns.push(colorGrid[row.y][x] === newColor ? BUTTONS.A : BUTTONS.NOOP);
      if (x === endX) break;
      insns.push(dirButton);
      x += step;
    }

    cursorX = endX;
    cursorY = row.y;
  }

  delay(insns, 40);
}

const insnCount = insns.length;
const pollingRate = 25 / 1000;
const etaTotal = Math.round(insnCount * pollingRate);
const etaMinutes = Math.floor(etaTotal / 60);
const etaSeconds = etaTotal % 60;
console.log(
  `Instructions: ${insnCount}, ETA: ${etaMinutes}:${etaSeconds.toString().padStart(2, "0")} (Pico / Pico 2 / Pico 2W)`,
);

await Deno.writeTextFile(
  "./rp2040src/drawing.h",
  `const uint8_t drawing_instructions[${insns.length}] = {` + insns.map((n) => n.toString()).join(", ") + "};",
);
