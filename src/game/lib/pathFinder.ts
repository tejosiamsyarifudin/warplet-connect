import { DIRECTIONS } from "../CONST";
import type { BFSState, Point } from "../type";

// 점이 보드 내부에 있는지 확인
function isInsideBoard(point: Point, rows: number, cols: number): boolean {
  return point.x >= 0 && point.x < rows && point.y >= 0 && point.y < cols;
}

// 점이 이동 가능한지 확인 (외부 경로 포함)
function canMoveTo(point: Point, board: number[][], end: Point): boolean {
  const rows = board.length;
  const cols = board[0].length;

  // 목표 지점이면 이동 가능
  if (point.x === end.x && point.y === end.y) return true;

  // 보드 내부이고 빈 공간이면 이동 가능
  if (isInsideBoard(point, rows, cols)) {
    return board[point.x][point.y] === 0;
  }

  // 외부 경로(-1까지)도 허용
  return point.x >= -1 && point.x <= rows && point.y >= -1 && point.y <= cols;
}

export function findPath(
  board: number[][],
  start: Point,
  end: Point
): Point[] | null {
  if (start.x === end.x && start.y === end.y) return null;

  const rows = board.length;
  const cols = board[0].length;

  // visited[row][col][direction][turns] - 각 방향과 턴 수에 따른 방문 상태
  // 외부 경로도 포함하기 위해 더 큰 범위로 설정
  const visited = Array.from({ length: rows + 2 }, () =>
    Array.from({ length: cols + 2 }, () =>
      Array.from({ length: 4 }, () => Array(3).fill(false))
    )
  );

  const queue: BFSState[] = [];

  // 시작점에서 모든 방향으로 시작
  for (let dir = 0; dir < 4; dir++) {
    visited[start.x + 1][start.y + 1][dir][0] = true;
    queue.push({
      point: start,
      path: [start],
      turns: 0,
      lastDir: dir,
    });
  }

  while (queue.length > 0) {
    const { point, path, turns, lastDir } = queue.shift()!;

    // 현재 방향으로 계속 이동
    for (let dir = 0; dir < 4; dir++) {
      const [dx, dy] = DIRECTIONS[dir];
      let nx = point.x + dx;
      let ny = point.y + dy;

      // 새로운 턴 수 계산
      const newTurns = lastDir === null || lastDir === dir ? turns : turns + 1;

      if (newTurns > 2) continue; // 최대 2번만 꺾을 수 있음

      const newPath = [...path];

      // 현재 방향으로 가능한 한 직진 (외부 경로 포함)
      while (canMoveTo({ x: nx, y: ny }, board, end)) {
        const current = { x: nx, y: ny };
        newPath.push(current);

        // 목표 지점에 도달
        if (nx === end.x && ny === end.y) {
          return newPath;
        }

        // 다른 방향으로 꺾을 수 있는지 확인
        for (let nextDir = 0; nextDir < 4; nextDir++) {
          const nextTurns = nextDir === dir ? newTurns : newTurns + 1;
          if (nextTurns > 2) continue;

          // 외부 경로도 포함하여 방문 상태 체크
          const visitX = nx + 1;
          const visitY = ny + 1;

          if (
            visitX >= 0 &&
            visitX < rows + 2 &&
            visitY >= 0 &&
            visitY < cols + 2
          ) {
            if (!visited[visitX][visitY][nextDir][nextTurns]) {
              visited[visitX][visitY][nextDir][nextTurns] = true;
              queue.push({
                point: current,
                path: [...newPath],
                turns: nextTurns,
                lastDir: nextDir,
              });
            }
          }
        }

        nx += dx;
        ny += dy;
      }
    }
  }

  return null;
}
