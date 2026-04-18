// initial setup:
// - pro mode enabled
// - blank base selected
// - current color is black
// - pen tool with 1px brush selected
// - cursor hovering over top left pixel
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
    image.height
  );
  const palette = new utils.Palette();
  for (const color of COLORS) palette.add(utils.Point.createByRGBA(color[0], color[1], color[2], 255));
  const result = await applyPalette(container, palette, {
    // TODO
  });
  const points = result.getPointArray();
  for (let i = 0; i < points.length; i++) {
    const x = i % image.width;
    const y = Math.floor(i / image.height);

    const orig = image.getPixel(x, y);
    if (orig && orig.a < 127) continue;

    const point = points[i];
    image.setPixel(x, y, point.r, point.g, point.b, 255);
  }
}

const insns: number[] = [];
let currentColor = DEFAULT_COLOR;
let down = true;
let right = true;
let x = 0;
let y = 0;

// initial setup
insns.push(
  // get the switch's attention
  BUTTONS.UP,
  BUTTONS.WAIT,
  BUTTONS.A,
  BUTTONS.WAIT,
  BUTTONS.A,
  BUTTONS.WAIT
);
delay(insns, 100);
insns.push(BUTTONS.A); // attempt confirm controller just in case bcuz jank
delay(insns, 100);

const colors: number[] = [];
let currentColorIdx = 0;
for (let y = 0; y < image.height; y++) {
  for (let x = 0; x < image.width; x++) {
    const pixel = image.getPixel(x, y)!;
    if (pixel.a < 127) continue;
    const color = getColorIdx(pixel.r, pixel.g, pixel.b);
    if (!colors.includes(color)) colors.push(color);
  }
}

// FIXME
await Deno.writeFile(
  "images/result.png",
  await image.encode("png")
);

function isDrawingPixel(x: number, y: number, colorOverride?: number) {
  const pixel = image.getPixel(x, y);
  if (!pixel) return false;
  if (pixel.a < 127) return false;

  const color = getColorIdx(pixel.r, pixel.g, pixel.b);
  if (color !== (colorOverride ?? currentColor)) return false;

  return true;
}

function handlePixel(x: number, y: number) {
  if (isDrawingPixel(x, y)) {
    insns.push(BUTTONS.A);
  } else {
    insns.push(BUTTONS.NOOP);
  }
}

function sectionIsEmpty(y: number, startX: number, endX: number, color?: number) {
  for (let x = startX; x <= endX; x++) {
    if (isDrawingPixel(x, y, color)) return false;
  }

  return true;
}

function canSkipRow() {
  const startX = right ? x : 0;
  const endX = right ? (image.width - 1) : x;
  if (!sectionIsEmpty(y, startX, endX)) return false;

  const endY = down ? (image.height - 1) : 0;
  if (y === endY) {
    if (currentColorIdx !== (colors.length - 1)) {
      const nextColor = colors[currentColorIdx + 1];
      if (!sectionIsEmpty(y, startX, endX, nextColor)) return false;
    }
  } else {
    const nextY = down ? (y + 1) : (y - 1);
    if (!sectionIsEmpty(nextY, startX, endX)) return false;
  }

  return true;
}

function canSkipLayer(color?: number) {
  if (down) {
    for (let i = y; i < image.height; i++) {
      if (!sectionIsEmpty(i, 0, image.width - 1, color)) return false;
    }
  } else {
    for (let i = y; i >= 0; i--) {
      if (!sectionIsEmpty(i, 0, image.width - 1, color)) return false;
    }
  }

  return true;
}

function canSkipImage() {
  if (!canSkipLayer()) return false;

  if (currentColorIdx !== (colors.length - 1)) {
    const nextColor = colors[currentColorIdx + 1];
    if (!canSkipLayer(nextColor)) return false;
  }

  return true;
}

function handleRow() {
  if (right) {
    while (true) {
      if (canSkipRow()) {
        insns.push(BUTTONS.NOOP);
        break;
      }
      handlePixel(x, y);

      if (x !== (image.width - 1)) {
        insns.push(BUTTONS.RIGHT);
        x++;
      } else {
        break;
      }
    }
  } else {
    while (true) {
      if (canSkipRow()) {
        insns.push(BUTTONS.NOOP);
        break;
      }
      handlePixel(x, y);

      if (x !== 0) {
        insns.push(BUTTONS.LEFT);
        x--;
      } else {
        break;
      }
    }
  }

  right = !right;
}

function handleImage() {
  if (down) {
    while (true) {
      if (canSkipImage()) {
        insns.push(BUTTONS.NOOP);
        break;
      }
      handleRow();

      if (y !== (image.height - 1)) {
        insns.push(BUTTONS.DOWN);
        y++;
      } else {
        break;
      }
    }
  } else {
    while (true) {
      if (canSkipImage()) {
        insns.push(BUTTONS.NOOP);
        break;
      }
      handleRow();

      if (y !== 0) {
        insns.push(BUTTONS.UP);
        y--;
      } else {
        break;
      }
    }
  }

  down = !down;
}

console.log(`${colors.length} colors`);

for (currentColorIdx = 0; currentColorIdx < colors.length; currentColorIdx++) {
  const newColor = colors[currentColorIdx];

  selectNewColor(insns, currentColor, newColor);
  currentColor = newColor;

  handleImage();
  delay(insns, 40);
}

const insnCount = insns.length;
const pollingRate = 25 / 1000;
const etaTotal = Math.round(insnCount * pollingRate);
const etaMinutes = Math.floor(etaTotal / 60);
const etaSeconds = etaTotal % 60;
console.log(`Instructions: ${insnCount}, ETA: ${etaMinutes}:${etaSeconds}`);

await Deno.writeTextFile(
  "./rp2040src/drawing.h",
  `const uint8_t drawing_instructions[${insns.length}] = {` + insns.map(n => n.toString()).join(", ") + "};"
);
