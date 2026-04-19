export const BUTTONS = {
  NOOP: 0,
  A: 1,
  Y: 2,
  RIGHT: 4,
  LEFT: 8,
  UP: 16,
  DOWN: 32,
  B: 64,
  WAIT: 128,
  X: 192,
} as const;

export function delay(insns: number[], count: number) {
  for (let i = 0; i < count; i++) insns.push(BUTTONS.NOOP);
}
