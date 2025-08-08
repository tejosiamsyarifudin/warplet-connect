import type { Point } from "../type";

const directions = [
    [-1, 0], // 상
    [1, 0],  // 하
    [0, -1], // 좌
    [0, 1],  // 우
];

interface BFSState {
    point: Point;
    path: Point[];
    turns: number;
    lastDir: number | null;
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
    const visited = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () =>
            Array.from({ length: 4 }, () => Array(3).fill(false))
        )
    );

    const queue: BFSState[] = [];
    
    // 시작점에서 모든 방향으로 시작
    for (let dir = 0; dir < 4; dir++) {
        visited[start.x][start.y][dir][0] = true;
        queue.push({ 
            point: start, 
            path: [start], 
            turns: 0, 
            lastDir: dir 
        });
    }

    while (queue.length > 0) {
        const { point, path, turns, lastDir } = queue.shift()!;
        
        // 현재 방향으로 계속 이동
        for (let dir = 0; dir < 4; dir++) {
            const [dx, dy] = directions[dir];
            let nx = point.x + dx;
            let ny = point.y + dy;
            
            // 새로운 턴 수 계산
            const newTurns = lastDir === null || lastDir === dir ? turns : turns + 1;
            
            if (newTurns > 2) continue; // 최대 2번만 꺾을 수 있음
            
            const newPath = [...path];
            
            // 현재 방향으로 가능한 한 직진
            while (
                nx >= 0 && nx < rows && ny >= 0 && ny < cols &&
                (board[nx][ny] === 0 || (nx === end.x && ny === end.y))
            ) {
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
                    
                    if (!visited[nx][ny][nextDir][nextTurns]) {
                        visited[nx][ny][nextDir][nextTurns] = true;
                        queue.push({
                            point: current,
                            path: [...newPath],
                            turns: nextTurns,
                            lastDir: nextDir
                        });
                    }
                }
                
                nx += dx;
                ny += dy;
            }
        }
    }

    return null;
}
