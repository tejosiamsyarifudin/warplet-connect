import React, { useRef, useEffect, useState } from "react";
import { findPath } from "../lib/pathFinder";
import type { Point } from "../type";
import { COLS, EMPTY, GRID_SIZE, ROWS, TILE_SIZE } from "../CONST";

export default function GameBoard() {
    const [board, setBoard] = useState<number[][]>(() => createBoard());
    const [selected, setSelected] = useState<Point | null>(null);
    const [path, setPath] = useState<Point[] | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    function createBoard() {
        const types = [1, 2, 3, 4];
        const board = Array.from({ length: ROWS }, () =>
            Array.from({ length: COLS }, () => types[Math.floor(Math.random() * types.length)])
        );
        return board;
    }

    // 격자 중앙점 좌표 구하기
    const getGridCenter = (row: number, col: number): Point => ({
        x: col * GRID_SIZE + GRID_SIZE / 2,
        y: row * GRID_SIZE + GRID_SIZE / 2,
    });

    // 타일 중앙점 좌표 구하기 (격자 중앙점과 동일)
    const getTileCenter = (row: number, col: number): Point => getGridCenter(row, col);

    // 클릭한 위치가 어떤 격자 셀인지 찾기
    const getGridPosition = (clientX: number, clientY: number): Point | null => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const col = Math.floor(x / GRID_SIZE);
        const row = Math.floor(y / GRID_SIZE);

        if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
            return { x: row, y: col };
        }
        return null;
    };

    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const gridPos = getGridPosition(event.clientX, event.clientY);
        if (!gridPos) return;

        const { x: row, y: col } = gridPos;
        
        if (board[row][col] === EMPTY) return;

        if (!selected) {
            setSelected({ x: row, y: col });
            setPath(null);
        } else {
            if (selected.x === row && selected.y === col) {
                setSelected(null);
                setPath(null);
                return;
            }
            
            if (board[selected.x][selected.y] !== board[row][col]) {
                setSelected(null);
                setPath(null);
                return;
            }

            // 경로 찾기
            const foundPath = findPath(board, selected, { x: row, y: col });
            if (foundPath) {
                setPath(foundPath);
                // 잠시 후 타일 제거
                setTimeout(() => {
                    const newBoard = board.map(row => [...row]);
                    newBoard[selected.x][selected.y] = EMPTY;
                    newBoard[row][col] = EMPTY;
                    setBoard(newBoard);
                    setSelected(null);
                    setPath(null);
                }, 500);
            } else {
                setSelected(null);
                setPath(null);
            }
        }
    };

    // 격자 그리기
    const drawGrid = (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = "#ddd";
        ctx.lineWidth = 1;

        // 수직선
        for (let col = 0; col <= COLS; col++) {
            ctx.beginPath();
            ctx.moveTo(col * GRID_SIZE, 0);
            ctx.lineTo(col * GRID_SIZE, ROWS * GRID_SIZE);
            ctx.stroke();
        }

        // 수평선
        for (let row = 0; row <= ROWS; row++) {
            ctx.beginPath();
            ctx.moveTo(0, row * GRID_SIZE);
            ctx.lineTo(COLS * GRID_SIZE, row * GRID_SIZE);
            ctx.stroke();
        }
    };

    // 타일 그리기
    const drawTiles = (ctx: CanvasRenderingContext2D) => {
        board.forEach((row, rowIndex) => {
            row.forEach((tile, colIndex) => {
                if (tile !== EMPTY) {
                    const center = getTileCenter(rowIndex, colIndex);
                    const tileRadius = TILE_SIZE / 2;

                    // 타일 배경
                    ctx.fillStyle = getTileColor(tile);
                    ctx.beginPath();
                    ctx.arc(center.x, center.y, tileRadius, 0, 2 * Math.PI);
                    ctx.fill();

                    // 타일 테두리
                    ctx.strokeStyle = "#333";
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // 타일 번호
                    ctx.fillStyle = "#fff";
                    ctx.font = "bold 16px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(tile.toString(), center.x, center.y);
                }
            });
        });
    };

    // 선택된 타일 하이라이트
    const drawSelection = (ctx: CanvasRenderingContext2D) => {
        if (selected) {
            const center = getTileCenter(selected.x, selected.y);
            const radius = TILE_SIZE / 2 + 3;

            ctx.strokeStyle = "#ff6b6b";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
        }
    };

    // 경로 그리기
    const drawPath = (ctx: CanvasRenderingContext2D) => {
        if (!path || path.length < 2) return;

        ctx.strokeStyle = "#ff6b6b";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        const start = getGridCenter(path[0].x, path[0].y);
        ctx.moveTo(start.x, start.y);

        for (let i = 1; i < path.length; i++) {
            const point = getGridCenter(path[i].x, path[i].y);
            ctx.lineTo(point.x, point.y);
        }

        ctx.stroke();
    };

    const getTileColor = (tileType: number): string => {
        const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4"];
        return colors[(tileType - 1) % colors.length];
    };

    // 캔버스 렌더링
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // 캔버스 초기화
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 격자 그리기
        drawGrid(ctx);

        // 타일 그리기
        drawTiles(ctx);

        // 선택된 타일 하이라이트
        drawSelection(ctx);

        // 경로 그리기
        drawPath(ctx);
    }, [board, selected, path]);

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <h2 className="text-2xl font-bold">LianLianKan 게임</h2>
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={COLS * GRID_SIZE}
                    height={ROWS * GRID_SIZE}
                    onClick={handleCanvasClick}
                    className="border-2 border-gray-300 cursor-pointer"
                    style={{ backgroundColor: "#f8f9fa" }}
                />
            </div>
            <div className="text-sm text-gray-600">
                같은 타일을 클릭하여 연결하세요. 최대 2번 꺾일 수 있습니다.
            </div>
        </div>
    );
}
