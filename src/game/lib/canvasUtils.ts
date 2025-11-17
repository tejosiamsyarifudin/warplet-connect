import { COLS, EMPTY, GRID_SIZE, ROWS, TILE_SIZE } from "../CONST";
import type { Point } from "../type";
import { getTileCenter } from "./boardUtils";

// 패딩 값 (캔버스 경계에서의 여백)
const PADDING = GRID_SIZE;

/**
 * 이미지 품질을 개선하기 위한 설정을 적용합니다.
 * @param ctx 캔버스 컨텍스트
 */
export function applyImageQualitySettings(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

/**
 * 고해상도 이미지로 리사이즈하는 함수
 * @param img 원본 이미지
 * @param targetWidth 목표 너비
 * @param targetHeight 목표 높이
 * @returns 리사이즈된 이미지
 */
export function resizeImageHighQuality(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): HTMLImageElement {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return img;

  // 고품질 렌더링 설정
  applyImageQualitySettings(ctx);

  // 이미지 그리기
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // 새로운 이미지 생성
  const resizedImg = new Image();
  resizedImg.src = canvas.toDataURL("image/png", 1.0);

  return resizedImg;
}

/**
 * 격자를 그립니다.
 * @param ctx 캔버스 컨텍스트
 */
export function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 1;

  // 수직선
  for (let col = 0; col <= COLS; col++) {
    ctx.beginPath();
    ctx.moveTo(col * GRID_SIZE + PADDING, PADDING);
    ctx.lineTo(col * GRID_SIZE + PADDING, ROWS * GRID_SIZE + PADDING);
    ctx.stroke();
  }

  // 수평선
  for (let row = 0; row <= ROWS; row++) {
    ctx.beginPath();
    ctx.moveTo(PADDING, row * GRID_SIZE + PADDING);
    ctx.lineTo(COLS * GRID_SIZE + PADDING, row * GRID_SIZE + PADDING);
    ctx.stroke();
  }
}

/**
 * 타일들을 그립니다.
 * @param ctx 캔버스 컨텍스트
 * @param board 게임 보드
 * @param images 로드된 이미지 배열
 */
export function drawTiles(
  ctx: CanvasRenderingContext2D,
  board: number[][],
  images: HTMLImageElement[]
): void {
  board.forEach((row, rowIndex) => {
    row.forEach((tile, colIndex) => {
      if (tile !== EMPTY && images[tile - 1]) {
        const center = getTileCenter(rowIndex, colIndex);
        const tileSize = TILE_SIZE;
        const tileRadius = tileSize / 2;

        // 패딩을 고려한 실제 위치
        const actualCenter = {
          x: center.x + PADDING,
          y: center.y + PADDING,
        };

        // 이미지 그리기
        const img = images[tile - 1];

        ctx.save();
        // 네모 모양으로 클리핑
        ctx.beginPath();
        ctx.rect(
          actualCenter.x - tileRadius,
          actualCenter.y - tileRadius,
          tileSize,
          tileSize
        );
        ctx.clip();

        // 이미지 품질 개선을 위한 설정
        applyImageQualitySettings(ctx);

        ctx.drawImage(
          img,
          actualCenter.x - tileRadius,
          actualCenter.y - tileRadius,
          tileSize,
          tileSize
        );

        ctx.restore();

        // 타일 테두리 (네모)
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 0.2;
        ctx.beginPath();
        ctx.rect(
          actualCenter.x - tileRadius,
          actualCenter.y - tileRadius,
          tileSize,
          tileSize
        );
        ctx.stroke();
      }
    });
  });
}

/**
 * 선택된 타일을 하이라이트합니다.
 * @param ctx 캔버스 컨텍스트
 * @param selected 선택된 타일 위치
 */
export function drawSelection(
  ctx: CanvasRenderingContext2D,
  selected: Point | null
): void {
  if (selected) {
    const center = getTileCenter(selected.x, selected.y);
    const tileSize = TILE_SIZE;
    const tileRadius = tileSize / 2;
    const highlightSize = tileSize + 6;

    // 패딩을 고려한 실제 위치
    const actualCenter = {
      x: center.x + PADDING,
      y: center.y + PADDING,
    };

    ctx.strokeStyle = "#7959ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(
      actualCenter.x - tileRadius - 3,
      actualCenter.y - tileRadius - 3,
      highlightSize,
      highlightSize
    );
    ctx.stroke();
  }
}

/**
 * 경로를 그립니다.
 * @param ctx 캔버스 컨텍스트
 * @param path 경로 점들
 */
export function drawPath(
  ctx: CanvasRenderingContext2D,
  path: Point[] | null
): void {
  if (!path || path.length < 2) return;

  ctx.strokeStyle = "#7959ff";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();

  // 첫 번째 점 그리기
  const start = path[0];
  let startX, startY;

  if (start.x < 0 || start.x >= ROWS || start.y < 0 || start.y >= COLS) {
    // 외부 경로인 경우 보드 경계에 맞춰 조정
    startX = Math.max(
      PADDING - GRID_SIZE / 2,
      Math.min(
        start.y * GRID_SIZE + GRID_SIZE / 2 + PADDING,
        COLS * GRID_SIZE + GRID_SIZE / 2 + PADDING
      )
    );
    startY = Math.max(
      PADDING - GRID_SIZE / 2,
      Math.min(
        start.x * GRID_SIZE + GRID_SIZE / 2 + PADDING,
        ROWS * GRID_SIZE + GRID_SIZE / 2 + PADDING
      )
    );
  } else {
    startX = start.y * GRID_SIZE + GRID_SIZE / 2 + PADDING;
    startY = start.x * GRID_SIZE + GRID_SIZE / 2 + PADDING;
  }

  ctx.moveTo(startX, startY);

  // 나머지 점들 그리기
  for (let i = 1; i < path.length; i++) {
    const point = path[i];
    let x, y;

    if (point.x < 0 || point.x >= ROWS || point.y < 0 || point.y >= COLS) {
      // 외부 경로인 경우 보드 경계에 맞춰 조정
      x = Math.max(
        PADDING - GRID_SIZE / 2,
        Math.min(
          point.y * GRID_SIZE + GRID_SIZE / 2 + PADDING,
          COLS * GRID_SIZE + GRID_SIZE / 2 + PADDING
        )
      );
      y = Math.max(
        PADDING - GRID_SIZE / 2,
        Math.min(
          point.x * GRID_SIZE + GRID_SIZE / 2 + PADDING,
          ROWS * GRID_SIZE + GRID_SIZE / 2 + PADDING
        )
      );
    } else {
      x = point.y * GRID_SIZE + GRID_SIZE / 2 + PADDING;
      y = point.x * GRID_SIZE + GRID_SIZE / 2 + PADDING;
    }

    ctx.lineTo(x, y);
  }

  ctx.stroke();
}
