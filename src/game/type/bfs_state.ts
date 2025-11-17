import type { Point } from "./point";

export interface BFSState {
  point: Point;
  path: Point[];
  turns: number;
  lastDir: number | null;
}
