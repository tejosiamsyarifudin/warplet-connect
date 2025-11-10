import React, { useRef, useEffect, useState } from "react";
import { createBoard, getGridPosition } from "../lib/boardUtils";
import { drawGrid, drawTiles, drawSelection, drawPath } from "../lib/canvasUtils";
import { handleCanvasClick } from "../lib/gameUtils";
import type { Point } from "../type";
import { COLS, GRID_SIZE, ROWS, TILE_IMAGES, EMPTY } from "../CONST";

interface GameBoardProps {
  onComplete?: () => void;
  onPause?: (pause: boolean) => void;
}

export default function GameBoard({ onComplete, onPause }: GameBoardProps) {
  const [board, setBoard] = useState<number[][]>(() => createBoard());
  const [selected, setSelected] = useState<Point | null>(null);
  const [path, setPath] = useState<Point[] | null>(null);
  const [shuffleCount, setShuffleCount] = useState<number>(3);
  const [showShuffleConfirm, setShowShuffleConfirm] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);

  // Load images
  useEffect(() => {
    const loadImages = async () => {
      const imagePromises = TILE_IMAGES.map(async (imageName) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        try {
          const imageUrl = new URL(`../../assets/tile/${imageName}`, import.meta.url).href;
          img.src = imageUrl;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(() => reject(new Error("timeout")), 5000);
          });
          return img;
        } catch {
          // fallback image
          const fallback = new Image();
          const canvas = document.createElement("canvas");
          canvas.width = 80;
          canvas.height = 80;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#f9ca24", "#6c5ce7"];
            const color = colors[Math.floor(Math.random() * colors.length)];
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 80, 80);
            ctx.strokeStyle = "#333";
            ctx.lineWidth = 3;
            ctx.strokeRect(0, 0, 80, 80);
          }
          fallback.src = canvas.toDataURL();
          return fallback;
        }
      });
      const results = await Promise.all(imagePromises);
      setImages(results);
    };
    loadImages().catch(console.error);
  }, []);

  const getGridPositionWrapper = (clientX: number, clientY: number): Point | null => {
    const rect = canvasRef.current?.getBoundingClientRect() || null;
    return getGridPosition(clientX, clientY, rect);
  };

  const handleCanvasClickWrapper = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (showShuffleConfirm) return;
    handleCanvasClick(
      event,
      board,
      selected,
      setSelected,
      setPath,
      setBoard,
      getGridPositionWrapper
    );
  };

  const shuffleBoard = () => {
    const remainingTiles = board.flat().filter((tile) => tile !== EMPTY);
    for (let i = remainingTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingTiles[i], remainingTiles[j]] = [remainingTiles[j], remainingTiles[i]];
    }
    const newBoard = board.map((row) => [...row]);
    let index = 0;
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        if (newBoard[i][j] !== EMPTY) {
          newBoard[i][j] = remainingTiles[index++];
        }
      }
    }
    setBoard(newBoard);
    setShuffleCount((s) => s - 1);
  };

  // cek semua tile sudah hilang
  useEffect(() => {
    if (showShuffleConfirm) return;
    const allCleared = board.flat().every((tile) => tile === EMPTY);
    if (allCleared && onComplete) {
      setTimeout(onComplete, 500);
    }
  }, [board, onComplete, showShuffleConfirm]);

  // render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.scale(dpr, dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.clearRect(0, 0, rect.width, rect.height);
    drawGrid(ctx);
    drawTiles(ctx, board, images);
    drawSelection(ctx, selected);
    drawPath(ctx, path);
  }, [board, selected, path, images]);

  return (
    <div className="flex flex-col items-center gap-4 relative">
      {/* Area canvas */}
      <div className="relative">
        <div
          className={`transition duration-300 ${
            showShuffleConfirm ? "blur-sm pointer-events-none" : ""
          }`}
        >
          <canvas
            ref={canvasRef}
            width={COLS * GRID_SIZE + GRID_SIZE * 2}
            height={ROWS * GRID_SIZE + GRID_SIZE * 2}
            onClick={handleCanvasClickWrapper}
            className="cursor-pointer"
          />
        </div>

        {/* Popup konfirmasi shuffle */}
        {showShuffleConfirm && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-md rounded-lg text-white p-6">
          <p className="text-lg font-bold mb-4">Do you want to shuffle?</p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                shuffleBoard();
                setShowShuffleConfirm(false);
                onPause?.(false);
              }}
              className="px-4 py-2 bg-green-600/30 backdrop-blur-md hover:bg-green-600/50 rounded-lg transition"
            >
              Yes
            </button>
            <button
              onClick={() => {
                setShowShuffleConfirm(false);
                onPause?.(false);
              }}
              className="px-4 py-2 bg-gray-500/30 backdrop-blur-md hover:bg-gray-500/50 rounded-lg transition"
            >
              No
            </button>
          </div>
        </div>        
        )}
      </div>

      {/* Tombol tetap di luar blur */}
      <div className="flex gap-3 relative z-30">
  {!showShuffleConfirm && (
    <button
      onClick={() => setBoard(createBoard())}
      className="px-4 py-2 bg-blue-600/30 backdrop-blur-md text-white rounded-lg hover:bg-blue-600/50 transition"
    >
      Reset
    </button>
  )}
  <button
    onClick={() => {
      if (shuffleCount > 0) {
        onPause?.(true);
        setShowShuffleConfirm(true);
      }
    }}
    disabled={shuffleCount <= 0}
    className={`px-4 py-2 rounded-lg text-white backdrop-blur-md transition ${
      shuffleCount > 0
        ? "bg-green-600/30 hover:bg-green-600/50"
        : "bg-gray-500/30 cursor-not-allowed"
    }`}
  >
    Shuffle ({shuffleCount})
  </button>
</div>

    </div>
  );
}
