import {
  COLS,
  EMPTY,
  GRID_SIZE,
  ROWS,
  TILE_COUNTS,
  TILE_IMAGES,
} from "../CONST";
import type { Point } from "../type";

const PADDING = GRID_SIZE;

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createBoard(): number[][] {
  const board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => EMPTY)
  );

  const totalSlots = ROWS * COLS; // 54
  const pairsNeeded = Math.floor(totalSlots / 2); // 27
  const allTilesRaw = [...TILE_COUNTS.SIX_COUNT, ...TILE_COUNTS.TEN_COUNT];
  // pastikan daftar jenis unik dan urut 0..N-1 sesuai TILE_IMAGES
  const allTiles = Array.from(new Set(allTilesRaw)).filter(
    (t) => t >= 0 && t < TILE_IMAGES.length
  );
  const numImages = allTiles.length; // biasanya 22

  if (numImages === 0) {
    throw new Error("No tile images available");
  }

  // distribusi pasangan: bagi merata lalu bagikan sisa
  const basePairs = Math.floor(pairsNeeded / numImages); // bisa 0 atau 1, dst
  const remainder = pairsNeeded % numImages; // beberapa gambar dapat +1 pair

  // bangun daftar pasangan berdasarkan distribusi
  const tilePairs: number[] = [];
  for (let i = 0; i < numImages; i++) {
    const tileIndex = allTiles[i];
    const pairsForThisImage = basePairs + (i < remainder ? 1 : 0);
    for (let p = 0; p < pairsForThisImage; p++) {
      // setiap pair berarti dua tile identik
      tilePairs.push(tileIndex, tileIndex);
    }
  }

  // Jika totalSlots ganjil, tambahkan 1 tile acak dari semua images
  if (tilePairs.length < totalSlots) {
    const extra = allTiles[Math.floor(Math.random() * numImages)];
    tilePairs.push(extra);
  }

  // Pastikan panjang tepat totalSlots (potong jika kelebihan)
  tilePairs.length = totalSlots;

  // Acak posisi tile
  shuffleArray(tilePairs);

  // isi papan (sesuaikan +1 jika renderer pakai 1-based filenames)
  let idx = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      board[r][c] = tilePairs[idx] + 1;
      idx++;
    }
  }

  // debug counts untuk verifikasi
  const counts: Record<number, number> = {};
  for (const t of tilePairs) counts[t] = (counts[t] ?? 0) + 1;
  console.log(
    `createBoard: total ${tilePairs.length} tiles (${ROWS}x${COLS}), pairsNeeded: ${pairsNeeded}, numImages: ${numImages}`
  );
  console.log("Tile counts:", counts);

  return board;
}

export function getGridCenter(row: number, col: number): Point {
  return {
    x: col * GRID_SIZE + GRID_SIZE / 2,
    y: row * GRID_SIZE + GRID_SIZE / 2,
  };
}

export function getTileCenter(row: number, col: number): Point {
  return getGridCenter(row, col);
}

export function getGridPosition(
  clientX: number,
  clientY: number,
  rect: DOMRect | null
): Point | null {
  if (!rect) return null;

  const x = clientX - rect.left - PADDING;
  const y = clientY - rect.top - PADDING;

  const col = Math.floor(x / GRID_SIZE);
  const row = Math.floor(y / GRID_SIZE);

  if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
    return { x: row, y: col };
  }
  return null;
}
