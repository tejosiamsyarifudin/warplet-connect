// src/game/components/GameBoard.tsx
import React, { useRef, useEffect, useState } from "react";
import { createBoard, getGridPosition } from "../lib/boardUtils";
import { drawGrid, drawTiles, drawSelection, drawPath } from "../lib/canvasUtils";
import { handleCanvasClick } from "../lib/gameUtils";
import type { Point } from "../type";
import { COLS, GRID_SIZE, ROWS, TILE_IMAGES, EMPTY } from "../CONST";
import { useSendTransaction, useAccount } from 'wagmi';
import { parseEther } from 'viem';

interface GameBoardProps {
    onComplete?: () => void
    onPause?: (pause: boolean) => void
    onScore?: (points: number) => void // added
    level?: number
    score?: number
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
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
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
  // Load images from Moralis with robust checks
  // ---------------------------
  useEffect(() => {
    const loadImages = async () => {
      setIsLoading(true);
      onPause?.(true);

      const MORALIS_KEY = import.meta.env.VITE_MORALIS_API_KEY || "";
      const gatewaysRaw = import.meta.env.VITE_IPFS_GATEWAYS || "https://ipfs.io/ipfs/";
      const GATEWAYS = gatewaysRaw.split(",").map((s: string) => s.trim()).filter(Boolean);
      const baseUrl = import.meta.env.VITE_MORALIS_BASE_URL;
      const headers: Record<string, string> = {};
      if (MORALIS_KEY) headers["X-API-Key"] = MORALIS_KEY;

      const safeJson = async (resp: Response) => {
        const contentType = resp.headers.get("content-type") || "";
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        if (!contentType.includes("application/json")) {
          // returned HTML or other - treat as failure
          const text = await resp.text().catch(() => "");
          throw new Error(`Not JSON response: ${text.slice(0, 200)}`);
        }
        return resp.json();
      };

      const fetchNFTPage = async () => {
        // fetch first page to get cursor and total
        const firstResp = await fetch(baseUrl, { headers });
        const firstJson = await safeJson(firstResp);
        const total = Number(firstJson.total) || 500;
        const limit = 27;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        // choose a random page within a reasonable bound
        const randomPage = Math.floor(Math.random() * totalPages) + 1;

        // iterate cursor to reach that page (Moralis uses cursor for pagination)
        let current = firstJson;
        for (let i = 2; i <= randomPage; i++) {
          if (!current.cursor) break;
          const nextResp = await fetch(`${baseUrl}&cursor=${current.cursor}`, { headers });
          current = await safeJson(nextResp);
        }

        const nftItems = (current.result || []).slice(0, 27);

        // resolve image urls and validate via gateways
        const urlResults = await Promise.allSettled(
          nftItems.map(async (item: any) => {
            let imageUrl: string | null = null;
            let metadata = item.normalized_metadata || item.metadata;

            if (typeof metadata === "string") {
              try {
                metadata = JSON.parse(metadata);
              } catch {
                metadata = null;
              }
            }

            imageUrl = metadata?.image || metadata?.image_url || null;

            if (!imageUrl && item.token_uri && item.token_uri.endsWith(".json")) {
              try {
                const metaResp = await fetch(item.token_uri);
                // token_uri may return HTML if blocked; check content-type
                if (!metaResp.ok) throw new Error("token_uri fetch failed");
                const ct = metaResp.headers.get("content-type") || "";
                if (!ct.includes("application/json")) throw new Error("token_uri not JSON");
                const meta = await metaResp.json();
                imageUrl = meta.image || meta.image_url || null;
              } catch (e) {
                // ignore and continue
              }
            }

            if (!imageUrl) throw new Error("No image field");

            // Normalize ipfs/arweave
            if (imageUrl.startsWith("ipfs://")) {
              const cid = imageUrl.replace("ipfs://", "");
              for (const gw of GATEWAYS) {
                const testUrl = gw + cid;
                // quick existence check using Image on client: faster than fetch for CORS-prone gateways
                const ok = await new Promise<boolean>((resolve) => {
                  const img = new Image();
                  img.crossOrigin = "anonymous";
                  img.src = testUrl;
                  const timer = setTimeout(() => resolve(false), 3000);
                  img.onload = () => { clearTimeout(timer); resolve(true); };
                  img.onerror = () => { clearTimeout(timer); resolve(false); };
                });
                if (ok) return testUrl;
              }
              throw new Error("All gateways failed");
            }

            // normal http(s) url
            return imageUrl;
          })
        );

        const validUrls = urlResults
          .filter((r) => r.status === "fulfilled")
          .map((r) => (r as PromiseFulfilledResult<string>).value);

        if (validUrls.length < 10) throw new Error("Too few valid images");

        // load images
        const imgs = await Promise.all(
          validUrls.map(async (url) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            await new Promise<void>((res, rej) => {
              img.onload = () => res();
              img.onerror = () => rej();
            });
            return img;
          })
        );

        return imgs;
      };

      // Try up to 3 attempts. if not enough images, fallback to local.
      let imgs: HTMLImageElement[] = [];
      let success = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔄 Moralis attempt ${attempt}`);
          imgs = await fetchNFTPage();
          if (imgs.length >= 20) { success = true; break; }
          console.warn(`⚠️ Attempt ${attempt} returned ${imgs.length} images`);
        } catch (err) {
          console.warn(`⚠️ Attempt ${attempt} failed:`, (err as Error).message || err);
          // short delay then retry
          await new Promise(res => setTimeout(res, 800));
        }
      }

      if (!success) {
        console.warn("❌ Falling back to local images");
        const localImages = await Promise.all(
          TILE_IMAGES.map(async (imageName) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = new URL(`../../assets/tile/${imageName}`, import.meta.url).href;
            await new Promise<void>((res, rej) => {
              img.onload = () => res();
              img.onerror = () => rej();
            });
            return img;
          })
        );
        imgs = localImages;
      }

      setImages(imgs);
      setIsLoading(false);
      setTimeout(() => { onPause?.(false); }, 500);
    };

    loadImages().catch((err) => {
      console.error("Load images fatal:", err);
      // final fallback
      (async () => {
        const localImages = await Promise.all(
          TILE_IMAGES.map(async (imageName) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = new URL(`../../assets/tile/${imageName}`, import.meta.url).href;
            await new Promise<void>((res, rej) => {
              img.onload = () => res();
              img.onerror = () => rej();
            });
            return img;
          })
        );
        setImages(localImages);
        setIsLoading(false);
        onPause?.(false);
      })();
    });
  }, []);

  // rest of board logic unchanged...
  const handleCanvasClickWrapper = (event: React.MouseEvent<HTMLCanvasElement>) => {
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
        getGridPosition(clientX, clientY, canvasRef.current?.getBoundingClientRect() || null)
    );
  
    // Check if any tiles were removed → +100 points
    const removed = prevBoard.flat().filter(Boolean).length - board.flat().filter(Boolean).length;
    if (removed > 0) {
      onScore?.(100);
    }
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
  
    // Define grid size explicitly
    const cols = 6; // adjust to your actual COLS
    const rows = 6; // adjust to your actual ROWS
    const gridSize = 64; // or your tile size in px
  
    // Logical pixel size
    const logicalWidth = cols * gridSize;
    const logicalHeight = rows * gridSize;
  
    // Resize canvas for high DPI displays
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    ctx.scale(dpr, dpr);
  
    // Match CSS size to fit screen width
    const maxWidth = Math.min(window.innerWidth * 0.9, logicalWidth);
    const scale = maxWidth / logicalWidth;
    canvas.style.width = `${logicalWidth * scale}px`;
    canvas.style.height = `${logicalHeight * scale}px`;
  
    // Clear + draw
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    drawGrid(ctx);
    drawTiles(ctx, board, images);
    drawSelection(ctx, selected);
    drawPath(ctx, path);
  }, [board, selected, path, images, isLoading]);
  

  return (
    <div className="relative flex flex-col items-center gap-4">
  <div className="relative overflow-hidden rounded-lg shadow-lg"
       style={{ width: `${COLS * GRID_SIZE + GRID_SIZE * 2}px`, height: `${ROWS * GRID_SIZE + GRID_SIZE * 2}px` }}>
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
                      to: '0xC7E8eD82a37fcA48D31CBe29a984c6Aaf929329c',
                      value: parseEther('0.00003'),
                    });
                    console.log('✅ Transaction sent:', tx);
                    shuffleBoard();
                  } catch (err) {
                    console.warn('❌ Transaction failed or rejected:', err);
                  } finally {
                    setShowShuffleConfirm(false);
                    onPause?.(false);
                  }
                }}
                className="px-4 py-2 bg-green-600/30 hover:bg-green-600/50 rounded-lg"
              >
                Yes
              </button>
              <button
                onClick={() => {
                  setShowShuffleConfirm(false);
                  onPause?.(false);
                }}
                className="px-4 py-2 bg-gray-500/30 hover:bg-gray-500/50 rounded-lg"
              >
                No
              </button>
            </div>
          </div>
        )}

        {showResetConfirm && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-md rounded-lg text-white p-6 z-40">
            <p className="text-lg font-bold mb-4">Do you want to reset the board?</p>
            <div className="flex gap-4">
              <button
                onClick={async () => {
                  try {
                    onPause?.(true);
                    const tx = await sendTransactionAsync({
                      to: '0xC7E8eD82a37fcA48D31CBe29a984c6Aaf929329c',
                      value: parseEther('0.00003'),
                    });
                    console.log('✅ Transaction sent:', tx);
                    setBoard(createBoard());
                  } catch (err) {
                    console.warn('❌ Transaction failed or rejected:', err);
                  } finally {
                    setShowResetConfirm(false);
                    onPause?.(false);
                  }
                }}
                className="px-4 py-2 bg-green-600/30 text-white rounded-lg hover:bg-green-600/50"
              >
                Yes
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-red-600/30 text-white rounded-lg hover:bg-red-600/50"
              >
                No
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg">
            <div className="rounded-2xl bg-gray-900/80 border border-white/10 px-6 py-4 text-center text-white text-sm font-medium shadow-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white/70 mx-auto mb-3"></div>
              Loading Onchain NFT images, please wait...
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
                className="px-4 py-2 bg-blue-600/30 text-white rounded-lg hover:bg-blue-600/50"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  if (shuffleCount > 0) {
                    onPause?.(true);
                    setShowShuffleConfirm(true);
                  }
                }}
                disabled={shuffleCount <= 0}
                className={`px-4 py-2 rounded-lg text-white backdrop-blur-md transition ${shuffleCount > 0 ? "bg-green-600/30 hover:bg-green-600/50" : "bg-gray-500/30 cursor-not-allowed"}`}
              >
                Shuffle ({shuffleCount})
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
