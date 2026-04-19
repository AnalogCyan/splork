import { BUTTONS, delay } from "./buttons.ts";

// these colors are a bit off because my capture card is shit but w/e I don't care
export type Color = [number, number, number];
export const DEFAULT_COLOR = 72; // black
const COLORS_PER_ROW = 12;
export const COLORS: Color[] = [
  [255, 255, 255],
  [238, 240, 246],
  [239, 241, 247],
  [240, 248, 253],
  [239, 251, 244],
  [239, 244, 238],
  [244, 250, 240],
  [253, 252, 239],
  [252, 243, 238],
  [249, 240, 238],
  [251, 237, 220],
  [249, 1, 1],

  [235, 235, 235],
  [207, 200, 231],
  [199, 204, 228],
  [199, 231, 251],
  [200, 241, 216],
  [200, 218, 200],
  [216, 238, 199],
  [249, 249, 199],
  [252, 214, 200],
  [237, 201, 200],
  [227, 207, 178],
  [254, 254, 4],

  [213, 213, 211],
  [166, 146, 212],
  [145, 159, 210],
  [147, 214, 251],
  [146, 229, 185],
  [146, 189, 147],
  [186, 224, 147],
  [248, 243, 147],
  [248, 180, 146],
  [223, 150, 144],
  [201, 169, 119],
  [9, 253, 3],

  [187, 187, 187],
  [98, 1, 189],
  [1, 74, 185],
  [14, 193, 250],
  [5, 217, 143],
  [3, 148, 22],
  [145, 210, 24],
  [247, 239, 4],
  [243, 132, 3],
  [208, 39, 0],
  [142, 98, 15],
  [19, 254, 252],

  [153, 156, 153],
  [84, 1, 163],
  [0, 64, 160],
  [8, 165, 213],
  [5, 186, 122],
  [2, 127, 14],
  [124, 180, 14],
  [212, 205, 2],
  [209, 112, 2],
  [179, 35, 0],
  [116, 65, 0],
  [0, 0, 248],

  [114, 114, 114],
  [64, 0, 129],
  [0, 49, 127],
  [7, 129, 167],
  [5, 147, 96],
  [2, 101, 12],
  [98, 142, 14],
  [167, 162, 1],
  [164, 88, 1],
  [140, 22, 0],
  [91, 56, 14],
  [133, 1, 249],

  [0, 0, 0],
  [31, 0, 73],
  [0, 22, 72],
  [2, 73, 95],
  [1, 84, 51],
  [0, 55, 0],
  [51, 81, 1],
  [95, 92, 2],
  [94, 45, 0],
  [79, 12, 0],
  [51, 32, 12],
  [250, 3, 191]
];
const NUM_ROWS = Math.floor(COLORS.length / COLORS_PER_ROW);

export function getColorIdx(r: number, g: number, b: number) {
  const idx = COLORS.findIndex(c => c[0] === r && c[1] === g && c[2] === b);
  if (idx === -1) throw new Error("what");
  return idx;
}

export function selectNewColor(
  insns: number[],
  currentColor: number,
  newColor: number
) {
  const currentRow = Math.floor(currentColor / COLORS_PER_ROW);
  const currentColumn = currentColor % COLORS_PER_ROW;

  const newRow = Math.floor(newColor / COLORS_PER_ROW);
  const newColumn = newColor % COLORS_PER_ROW;

  // once to select the color picker, one to open the full colors
  insns.push(BUTTONS.Y);
  delay(insns, 40);
  insns.push(BUTTONS.Y);
  delay(insns, 40);

  if (newRow !== currentRow) {
    const downCase = newRow > currentRow
      ? (newRow - currentRow)
      : ((NUM_ROWS - currentRow) + newRow);
    const upCase = newRow > currentRow
      ? (currentRow + (NUM_ROWS - newRow))
      : (currentRow - newRow);

    const [count, button] = downCase < upCase
      ? [downCase, BUTTONS.DOWN]
      : [upCase, BUTTONS.UP];
    for (let i = 0; i < count; i++) {
      insns.push(button);
      delay(insns, 1);
    }
  }
  // delay(5);

  if (newColumn !== currentColumn) {
    const rightCase = newColumn > currentColumn
      ? (newColumn - currentColumn)
      : ((COLORS_PER_ROW - currentColumn) + newColumn);
    const leftCase = newColumn > currentColumn
      ? (currentColumn + (COLORS_PER_ROW - newColumn))
      : (currentColumn - newColumn);

    const [count, button] = rightCase < leftCase
      ? [rightCase, BUTTONS.RIGHT]
      : [leftCase, BUTTONS.LEFT];
    for (let i = 0; i < count; i++) {
      insns.push(button);
      delay(insns, 1);
    }
  }

  delay(insns, 5);
  insns.push(BUTTONS.A);
  delay(insns, 40);
}
