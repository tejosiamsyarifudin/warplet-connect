// src/game/components/GameBoard.tsx
import React, { useRef, useEffect, useState } from "react";
import { createBoard, getGridPosition } from "../lib/boardUtils";
import {
  drawGrid,
  drawTiles,
  drawSelection,
  drawPath,
} from "../lib/canvasUtils";
import { handleCanvasClick } from "../lib/gameUtils";
import type { Point } from "../type";
import { COLS, GRID_SIZE, ROWS, TILE_IMAGES, EMPTY } from "../CONST";
import { useSendTransaction, useAccount } from "wagmi";
import { parseEther } from "viem";

interface GameBoardProps {
  onComplete?: () => void;
  onPause?: (pause: boolean) => void;
  onScore?: (points: number) => void; // added
  level?: number;
  score?: number;
}

export default function GameBoard({
  onComplete,
  onPause,
  onScore,
  level = 1,
  score = 0,
}: GameBoardProps) {
  const [board, setBoard] = useState<number[][]>(() => createBoard());
  const [selected, setSelected] = useState<Point | null>(null);
  const [path, setPath] = useState<Point[] | null>(null);
  const [shuffleCount, setShuffleCount] = useState<number>(3);
  const [showShuffleConfirm, setShowShuffleConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { sendTransactionAsync } = useSendTransaction();
  const { address } = useAccount();
  const hasSavedRef = useRef(false);

  // ---------------------------
  // Save score to Supabase Edge Function
  // ---------------------------
  const saveScore = async (wallet: string, level: number, score: number) => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn("Supabase environment variables missing");
      return;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/save-score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ wallet, level, score }),
      });

      if (!res.ok) {
        const msg = await res.text();
        console.error("❌ Failed to save score:", msg);
      } else {
        console.log("✅ Score saved successfully");
      }
    } catch (err) {
      console.error("❌ Network or server error:", err);
    }
  };

  // ---------------------------
  // Load images with robust checks
  // ---------------------------
  useEffect(() => {
    const loadImages = async () => {
      setIsLoading(true);
      onPause?.(true);

      try {
        const localImages = await Promise.all(
          TILE_IMAGES.map(async (imageName) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = new URL(
              `../../assets/tile/${imageName}`,
              import.meta.url
            ).href;

            await new Promise<void>((res, rej) => {
              img.onload = () => res();
              img.onerror = () => rej();
            });

            return img;
          })
        );

        setImages(localImages);
        setIsLoading(false);

        setTimeout(() => {
          onPause?.(false);
        }, 500);
      } catch (err) {
        console.error("Load images error:", err);

        // final fallback
        const fallbackImages = await Promise.all(
          TILE_IMAGES.map(async (imageName) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageName;

            await new Promise<void>((res, rej) => {
              img.onload = () => res();
              img.onerror = () => rej();
            });

            return img;
          })
        );

        setImages(fallbackImages);
        setIsLoading(false);
        onPause?.(false);
      }
    };

    loadImages();
  }, []);

  // rest of board logic unchanged...
  const handleCanvasClickWrapper = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    if (showShuffleConfirm || isLoading) return;

    // Clone board to compare before/after
    const prevBoard = structuredClone(board);

    handleCanvasClick(
      event,
      board,
      selected,
      setSelected,
      setPath,
      setBoard,
      (clientX, clientY) =>
        getGridPosition(
          clientX,
          clientY,
          canvasRef.current?.getBoundingClientRect() || null
        )
    );

    // Check if any tiles were removed → +100 points
    const removed =
      prevBoard.flat().filter(Boolean).length -
      board.flat().filter(Boolean).length;
    if (removed > 0) {
      onScore?.(100);
    }
  };

  const shuffleBoard = () => {
    const remainingTiles = board.flat().filter((tile) => tile !== EMPTY);
    for (let i = remainingTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingTiles[i], remainingTiles[j]] = [
        remainingTiles[j],
        remainingTiles[i],
      ];
    }
    const newBoard = board.map((row) => [...row]);
    let index = 0;
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        if (newBoard[i][j] !== EMPTY) newBoard[i][j] = remainingTiles[index++];
      }
    }
    setBoard(newBoard);
    setShuffleCount((s) => s - 1);
  };

  useEffect(() => {
    if (showShuffleConfirm) return;

    const allCleared = board.flat().every((tile) => tile === EMPTY);
    if (!allCleared || !onComplete) return;

    if (!hasSavedRef.current) {
      hasSavedRef.current = true;
      console.log("🎉 Level complete!");

      const finalScore = (score ?? 0) + 100;
      if (address) {
        saveScore(address, level, finalScore);
      }

      // Delay reset so next level loads cleanly
      setTimeout(() => {
        hasSavedRef.current = false;
        onComplete();
      }, 500);
    }
  }, [board, onComplete, showShuffleConfirm, address, level, score]);

  useEffect(() => {
    if (isLoading) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Use your actual constants
    const logicalWidth = COLS * GRID_SIZE + GRID_SIZE * 2;
    const logicalHeight = ROWS * GRID_SIZE + GRID_SIZE * 2;

    // Set internal pixel size for retina clarity
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    ctx.scale(dpr, dpr);

    // Scale CSS size to fit the screen width responsively
    const maxWidth = Math.min(window.innerWidth * 1.4, logicalWidth);
    const scale = maxWidth / logicalWidth;
    canvas.style.width = `${logicalWidth * scale}px`;
    canvas.style.height = `${logicalHeight * scale}px`;

    // Draw
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    drawGrid(ctx);
    drawTiles(ctx, board, images);
    drawSelection(ctx, selected);
    drawPath(ctx, path);
  }, [board, selected, path, images, isLoading]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <div
        className="relative overflow-hidden rounded-lg shadow-lg"
        style={{
          width: `${COLS * GRID_SIZE + GRID_SIZE * 2}px`,
          height: `${ROWS * GRID_SIZE + GRID_SIZE * 2}px`,
        }}
      >
        <div className="flex justify-center items-center w-full overflow-hidden">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClickWrapper}
            className="cursor-pointer block max-w-full h-auto"
            width={COLS * GRID_SIZE + GRID_SIZE * 2}
            height={ROWS * GRID_SIZE + GRID_SIZE * 2}
          />
        </div>
        {showShuffleConfirm && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-md rounded-lg text-white p-6 z-40">
            <p className="text-lg font-bold mb-4">Do you want to shuffle?</p>
            <div className="flex gap-4">
              <button
                onClick={async () => {
                  try {
                    onPause?.(true);
                    const tx = await sendTransactionAsync({
                      to: address,
                      value: parseEther("0.00003"),
                    });
                    console.log("✅ Transaction sent:", tx);
                    shuffleBoard();
                  } catch (err) {
                    console.warn("❌ Transaction failed or rejected:", err);
                  } finally {
                    setShowShuffleConfirm(false);
                    onPause?.(false);
                  }
                }}
                className="mt-4 btnBackground text-white font-semibold p-4 rounded-lg hover:bg-blue-700 transition text-center"
              >
                Yes
              </button>
              <button
                onClick={() => {
                  setShowShuffleConfirm(false);
                  onPause?.(false);
                }}
                className="mt-4 btnBackground text-white font-semibold p-4 rounded-lg hover:bg-blue-700 transition text-center"
              >
                No
              </button>
            </div>
          </div>
        )}

        {showResetConfirm && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-md rounded-lg text-white p-6 z-40">
            <p className="text-lg font-bold mb-4">
              Do you want to reset the board?
            </p>
            <div className="flex gap-4">
              <button
                onClick={async () => {
                  try {
                    onPause?.(true);
                    const tx = await sendTransactionAsync({
                      to: address,
                      value: parseEther("0.00003"),
                    });
                    console.log("✅ Transaction sent:", tx);
                    setBoard(createBoard());
                  } catch (err) {
                    console.warn("❌ Transaction failed or rejected:", err);
                  } finally {
                    setShowResetConfirm(false);
                    onPause?.(false);
                  }
                }}
                className="mt-4 btnBackground text-white font-semibold p-4 rounded-lg hover:bg-blue-700 transition text-center"
              >
                Yes
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="mt-4 btnBackground text-white font-semibold p-4 rounded-lg hover:bg-blue-700 transition text-center"
              >
                No
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center">
            <div className="rounded-2xl bg-gray-900/80 border border-white/10 px-6 py-4 text-center text-white text-sm font-medium shadow-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white/70 mx-auto mb-3"></div>
              Loading NFT images, please wait...
            </div>
          </div>
        )}
      </div>

      {!isLoading && (
        <div className="flex gap-3 relative z-30">
          {!showShuffleConfirm && !showResetConfirm && (
            <>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-10 h-10 rounded-full btnBackground transition flex items-center justify-center"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="invert"
                >
                  <path
                    d="M13 19H17.2942C19.1594 19 20.092 19 20.6215 18.6092C21.0832 18.2685 21.3763 17.7459 21.4263 17.1743C21.4836 16.5187 20.9973 15.7229 20.0247 14.1313L19.0278 12.5M6.13014 10.6052L3.97528 14.1314C3.00267 15.7229 2.51637 16.5187 2.57372 17.1743C2.62372 17.7459 2.91681 18.2685 3.37846 18.6092C3.90799 19 4.84059 19 6.70578 19H8.5M16.8889 8.99999L14.7305 5.46808C13.8277 3.99079 13.3763 3.25214 12.7952 3.00033C12.2879 2.78049 11.7121 2.78049 11.2048 3.00033C10.6237 3.25214 10.1723 3.99079 9.2695 5.46809L8.24967 7.13689M18 5.00006L16.9019 9.09813L12.8038 8.00006M2 11.5981L6.09808 10.5L7.19615 14.5981M15.5 22L12.5 19L15.5 16"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>{" "}
              </button>
              <button
                onClick={() => {
                  if (shuffleCount > 0) {
                    onPause?.(true);
                    setShowShuffleConfirm(true);
                  }
                }}
                disabled={shuffleCount <= 0}
                className={`w-10 h-10 rounded-full btnBackground transition flex items-center justify-center
     ${shuffleCount <= 0 ? "opacity-30" : "opacity-100"}`}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="invert"
                >
                  <path
                    d="M18 15L21 18M21 18L18 21M21 18H18.5689C17.6297 18 17.1601 18 16.7338 17.8705C16.3564 17.7559 16.0054 17.5681 15.7007 17.3176C15.3565 17.0348 15.096 16.644 14.575 15.8626L14.3333 15.5M18 3L21 6M21 6L18 9M21 6H18.5689C17.6297 6 17.1601 6 16.7338 6.12945C16.3564 6.24406 16.0054 6.43194 15.7007 6.68236C15.3565 6.96523 15.096 7.35597 14.575 8.13744L9.42496 15.8626C8.90398 16.644 8.64349 17.0348 8.29933 17.3176C7.99464 17.5681 7.64357 17.7559 7.2662 17.8705C6.83994 18 6.37033 18 5.43112 18H3M3 6H5.43112C6.37033 6 6.83994 6 7.2662 6.12945C7.64357 6.24406 7.99464 6.43194 8.29933 6.68236C8.64349 6.96523 8.90398 7.35597 9.42496 8.13744L9.66667 8.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
