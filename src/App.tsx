import { sdk } from "@farcaster/miniapp-sdk";
import { useState, useEffect, useMemo } from "react";
import GameBoard from "./game/components/GameBoard";
import { useAccount, useConnect, useSendCalls } from "wagmi";
import LeaderboardIcon from "./assets/leaderboard.svg";
import FlameIcon from "./assets/flame.svg";
import DefaultImage from "./assets/default.png";
import WarpletImage from "./assets/warplet.png";
import { fetchLeaderboard } from "./game/lib/fetchLeaderboard";
import { fetchHighscore } from "./game/lib/fetchHighscore";
import { Analytics } from "@vercel/analytics/react";
import { parseEther, encodeFunctionData, parseUnits } from "viem";
import { BACKGROUNDS } from "./backgrounds";
import StarImage from "./game/components/StarImage";

// Uniswap V2 Router ABI (minimal - only swapETHForExactTokens function)
const uniswapRouterAbi = [
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "swapETHForExactTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "payable",
    type: "function",
  },
];

type StreakData = {
  streak: number;
  signed_today: boolean;
};

function App() {
  const [ready, setReady] = useState(false);
  const [_isAppAdded, setIsAppAdded] = useState<boolean | null>(null);

  const [chooseCharacter, setChooseCharacter] = useState(false);

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(150);
  const [gameKey, setGameKey] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();

  const [profile, setProfile] = useState<{
    avatar?: string;
    uid?: number;
    identity?: string;
  } | null>(null);

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<
    { wallet_address: string; score: number }[]
  >([]);

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [streak, setStreak] = useState(0);
  const [signedToday, setSignedToday] = useState(false);
  const [showDailyStreak, setShowDailyStreak] = useState(false);
  const [bg, setBg] = useState(BACKGROUNDS[0]);

  //SUPABASE
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Supabase environment variables missing");
    return;
  }

  const fcConnector = useMemo(
    () => connectors.find((c) => c.name.toLowerCase().includes("farcaster")),
    [connectors]
  );

  const connectFarcaster = async () => {
    if (!fcConnector) return;
    try {
      await connect({ connector: fcConnector });
    } catch (e) {
      console.error(e);
    }
  };

  const { sendCalls } = useSendCalls();

  const handleSwap = async () => {
    if (!address) return console.error("No wallet connected");

    try {
      const amountOut = parseUnits("0.01", 6); // 0.01 USDC
      const path = [
        "0x4200000000000000000000000000000000000006", // WETH on Base
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
      ] as const;
      const to = address;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 10);

      const data = encodeFunctionData({
        abi: uniswapRouterAbi,
        functionName: "swapETHForExactTokens",
        args: [amountOut, path, to, deadline],
      });

      await sendCalls({
        calls: [
          {
            to: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24", // Uniswap V2/V3 router on Base
            data,
            value: parseEther("0.000005"), // max ETH to spend
          },
        ],
      });

      console.log("✅ Swap transaction sent");
      await signToday();
    } catch (error) {
      console.error("❌ Swap failed:", error);
    }
  };

  // LOAD STREAK AFTER LOGIN
  useEffect(() => {
    const loadStreak = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-streak`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ wallet: address }),
        });

        const data: StreakData = await res.json();
        console.log("streak response:", data);

        setStreak(data.streak);
        setSignedToday(data.signed_today);
      } catch (err) {
        console.error("reload streak failed:", err);
      }
    };

    loadStreak();
  }, [isConnected, address, showDailyStreak]);

  const signToday = async () => {
    if (!address || signedToday) return;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-streak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ wallet: address }),
      });

      const data: StreakData = await res.json();

      setStreak(data.streak);
      setSignedToday(data.signed_today);
    } catch (err) {
      console.error("Failed sign today:", err);
    }
  };

  // INITIALIZE FARCASTER
  useEffect(() => {
    (async () => {
      try {
        await sdk.actions.ready();
      } catch {}

      setReady(true);
      const context = await sdk.context;

      setIsAppAdded(context.client?.added ?? false);
      if (!context.client?.added) {
        await sdk.actions.addMiniApp();
      }
    })();
  }, []);

  useEffect(() => {
    if (!address) return;

    const loadProfile = async () => {
      try {
        const res = await fetch(
          `https://api.web3.bio/profile/farcaster/${address}`
        );

        if (!res.ok) return;

        const data = await res.json();

        setProfile({
          avatar: data.avatar,
          uid: data.social?.uid,
          identity: data.identity,
        });
      } catch (err) {
        console.error("profile load failed:", err);
      }
    };

    loadProfile();
  }, [address]);

  const goHome = () => {
    setIsPlaying(false);
    setChooseCharacter(false);
  };

  // GAME LOGIC
  useEffect(() => {
    let t = 150;
    if (level > 30 && level <= 60) t = 90;
    else if (level > 60 && level <= 90) t = 60;
    else if (level > 90 && level <= 99) t = 45;
    else if (level > 100 && level <= 110) t = 30;
    else if (level > 111) t = 25;
    setTimeLeft(t);
  }, [level]);

  useEffect(() => {
    if (!isPlaying || isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, isPaused, gameKey]);

  useEffect(() => {
    if (timeLeft === 0 && isPlaying && !isPaused) {
      setIsPlaying(false);
      setIsGameOver(true);
      setLevel(1);
      setScore(0);
    }
  }, [timeLeft, isPlaying, isPaused]);

  const startGame = () => {
    const random = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    setBg(random);

    setLevel(1);
    setScore(0);
    setTimeLeft(150);
    setGameKey((k) => k + 1);
    setIsPlaying(true);
    setIsPaused(false);
    setIsGameOver(false);
  };

  const handleScore = (p: number) => setScore((s) => s + p);
  const handlePause = (v: boolean) => setIsPaused(v);
  const handleLevelComplete = () => {
    const next = level < 120 ? level + 1 : 1;

    const random = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    setBg(random);

    setScore((s) => s + 100);
    setLevel(next);
    setGameKey((k) => k + 1);
  };

  // const handleReset = () => {
  //   setLevel(1);
  //   setScore(0);
  //   setGameKey((k) => k + 1);
  //   setTimeLeft(150);
  // };

  // const handleShuffle = () => {
  //   setGameKey((k) => k + 1);
  // };

  const openLeaderboard = async () => {
    setShowLeaderboard(true);
    const data = await fetchLeaderboard();
    setLeaderboard(data);
  };

  const [myHighscore, setMyHighscore] = useState(0);

  useEffect(() => {
    if (!address) return;

    const load = async () => {
      const hs = await fetchHighscore(address);
      setMyHighscore(hs);
    };

    load();
  }, [address]);

  if (!ready) return <div className="card">Loading...</div>;

  return (
    <>
      <div
        className="flex flex-col min-h-screen"
        style={{
          backgroundImage: isPlaying && bg ? `url(${bg})` : "none",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* HEADER */}
        <header className="flex justify-between items-center py-2 px-4 bg-white/40">
          {isPlaying ? (
            <>
              <div className="flex text-white text-sm pointer-events-auto justify-between gap-4">
                {" "}
                <span className="w-10 h-10 rounded-full btnBackground transition flex items-center justify-center">
                  {" "}
                  {level}{" "}
                </span>{" "}
                <span className="m-auto textGradient">Time: {timeLeft}</span>
                <span className="m-auto textGradient">Score: {score}</span>{" "}
              </div>

              <div className="flex justify-between gap-2">
                {/* Right section */}

                {/* Reset Button */}
                {/* <button className="w-10 h-10 rounded-full btnBackground transition flex items-center justify-center">
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
                  </svg>
                </button> */}

                {/* Shuffle Button */}
                {/* <button className="w-10 h-10 rounded-full btnBackground transition flex items-center justify-center">
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
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button> */}

                <button
                  onClick={goHome}
                  className="w-10 h-10 rounded-full btnBackground transition flex items-center justify-center z-40"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 576 512"
                    fill="currentColor"
                    className="invert"
                  >
                    <path
                      d="M280.4 148.3L96 300.1V464c0 8.8 7.2 16 16 16l112-.3c8.8 0 16-7.2 16-16V368c0-8.8 
                7.2-16 16-16h64c8.8 0 16 7.2 16 16v95.7c0 8.8 7.2 16 16 16l112 .3c8.8 0 16-7.2 16-16V300L295.6 
                148.3a16 16 0 0 0-15.2 0zM571.6 251.5l-61.6-49.6V48c0-8.8-7.2-16-16-16h-48c-8.8 0-16 
                7.2-16 16v72.6L318.5 43a48 48 0 0 0-61 0L4.3 251.5c-6.8 5.5-7.9 15.6-2.3 
                22.3l20.3 24.7c5.5 6.8 15.6 7.9 22.3 2.3L280.4 117.7c5-4 12.1-4 17.1 
                0l235.8 182.9c6.8 5.5 16.9 4.5 22.3-2.3l20.3-24.7c5.5-6.8 4.4-16.9-2.3-22.1z"
                    />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            isConnected && (
              <>
                <span className="textGradient">
                  Welcome, {profile?.identity}
                </span>

                <div className="flex items-center gap-3 text-white text-lg font-bold">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (!signedToday) setShowDailyStreak(true);
                      }}
                      disabled={signedToday}
                    >
                      <span className="relative flex items-center justify-center w-8 h-8">
                        <img src={FlameIcon} className="w-8 h-8" />
                        <span className="absolute inset-0 flex items-center justify-center textGradient font-bold pt-1 text-xs">
                          {streak}
                        </span>
                      </span>
                    </button>
                  </div>

                  {profile?.avatar && (
                    <img
                      onClick={() => setShowHowToPlay(true)}
                      src={profile.avatar}
                      className="w-8 h-8 rounded-full border border-white/40"
                    />
                  )}
                </div>
              </>
            )
          )}
        </header>

        {/* MAIN */}
        <main className="flex-1 p-2 flex flex-col items-center relative w-full">
          {/* GAME BOARD */}
          <div
            className={`transition-all duration-500 ${
              isPlaying ? isPaused : "opacity-80 blur-sm pointer-events-none"
            }`}
          >
            <div className="flex justify-center items-center w-full">
              <div className="relative w-full max-w-sm aspect-square">
                {isPlaying && (
                  <GameBoard
                    key={gameKey}
                    onComplete={handleLevelComplete}
                    onPause={handlePause}
                    onScore={handleScore}
                    level={level}
                    score={score}
                  />
                )}
              </div>
            </div>
          </div>

          {/* START SCREEN */}
          {!isPlaying && !isGameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-top bg-white/20  rounded-lg p-6">
              <div className="flex flex-col items-center gap-4">
                <StarImage src={DefaultImage} />
                <div className="textGradient44"> Warplet Connect </div>
                {!isConnected ? (
                  <button
                    onClick={connectFarcaster}
                    className="mt-4 btnBackground text-white font-semibold p-4 rounded-lg hover:bg-blue-700 transition text-center"
                  >
                    Sign In
                  </button>
                ) : (
                  <>
                    <div className="textGradient22">
                      {" "}
                      Highscore: {myHighscore}{" "}
                    </div>
                    {!chooseCharacter && (
                      <button
                        onClick={() => setChooseCharacter(true)}
                        className="btnFloatSun btnBackground"
                      >
                        <svg
                          viewBox="0 0 448 512"
                          xmlns="http://www.w3.org/2000/svg"
                          width="26px"
                          aria-hidden="true"
                        >
                          <path
                            d="M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    )}
                  </>
                )}
                {chooseCharacter && (
                  <div className="flex justify-between gap-4">
                    {" "}
                    <button onClick={() => startGame()}>
                      {" "}
                      <img
                        src={WarpletImage}
                        className="w-28 h-28 rounded-[20px]"
                      />{" "}
                    </button>
                    <button onClick={() => startGame()}>
                      <img
                        src={DefaultImage}
                        className="w-28 h-28 rounded-[20px]"
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GAME OVER */}
          {!isPlaying && isGameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60">
              <h2 className="text-3xl font-bold mb-4 text-white">Game Over</h2>
              <button
                onClick={startGame}
                className="mt-4 btnBackground text-white font-semibold p-4 rounded-lg hover:bg-blue-700 transition text-center"
              >
                Start New Game
              </button>
            </div>
          )}

          {/* LEADERBOARD MODAL */}
          {showLeaderboard && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 z-50">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-80 max-h-[80vh] overflow-y-auto text-center">
                <h2 className="text-xl font-bold text-center mb-4 text-white">
                  Leaderboard
                </h2>
                <ul className="space-y-2">
                  {leaderboard.map((item, index) => (
                    <li
                      key={item.wallet_address}
                      className="flex justify-between items-center text-white text-sm bg-white/10 rounded-lg px-3 py-2"
                    >
                      <span>
                        {index + 1}. {item.wallet_address.slice(0, 6)}...
                        {item.wallet_address.slice(-4)}
                      </span>
                      <span className="font-bold">{item.score}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="mt-4 btnBackground text-white font-semibold p-4 rounded-lg hover:bg-blue-700 transition text-center"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* HOW TO PLAY MODAL */}
          {showHowToPlay && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 z-50">
              <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-4 w-80 max-h-[80vh] overflow-y-auto text-white text-center">
                {/* TOP RIGHT CLOSE (X) */}
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="absolute top-2 right-2 text-white text-xl font-bold"
                >
                  ×
                </button>

                <h2 className="text-xl font-bold text-center mb-4">
                  How to Play
                </h2>

                <div className="text-white text-sm space-y-4">
                  <ul className="list-disc list-inside space-y-2">
                    <li>You connect two matching icons.</li>
                    <li>A valid path has zero, one, or two turns.</li>
                    <li>You clear tiles to finish the level.</li>
                    <li>Your time depends on your level.</li>
                    <li>You get points for every match and level.</li>
                  </ul>

                  <img
                    src="/guide.png"
                    alt="How to play guide"
                    className="w-full rounded-lg shadow-md"
                  />
                </div>

                {/* BOTTOM CLOSE BUTTON */}
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="mt-4 btnBackground text-white font-semibold p-4 rounded-lg hover:bg-blue-700 transition text-center"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* DAILY STREAK MODAL */}
          {showDailyStreak && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 z-50">
              <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-80">
                <button
                  onClick={() => setShowDailyStreak(false)}
                  className="absolute top-2 right-2 text-white text-xl font-bold"
                >
                  ×
                </button>

                <h2 className="text-xl font-bold text-center mb-4 text-white">
                  Daily Streak
                </h2>

                <div className="flex items-center justify-center gap-2 mb-4">
                  <img src={FlameIcon} className="w-8 h-8" />
                  <span className="text-white text-lg font-bold">{streak}</span>
                </div>

                <button
                  onClick={handleSwap}
                  className={`w-full py-3 rounded-lg font-bold transition ${
                    signedToday
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-orange-600"
                  }`}
                >
                  {signedToday ? "Signed Today" : "Sign Today"}
                </button>
              </div>
            </div>
          )}

          {/* FLOATING BUTTON */}
          <button
            onClick={openLeaderboard}
            className="fixed bottom-2 right-2 w-10 h-10 rounded-full btnBackground transition flex items-center justify-center z-40"
          >
            <img src={LeaderboardIcon} className="w-6 h-6 invert" />
          </button>

          <button
            onClick={() => {
              if (!signedToday) setShowDailyStreak(true);
            }}
            disabled={signedToday}
            className={`fixed bottom-2 left-2 w-10 h-10 rounded-full btnBackground transition flex items-center justify-center z-40
    ${
      signedToday
        ? "bg-gray-500/40 cursor-not-allowed opacity-50"
        : "bg-orange-600/40 hover:bg-orange-600/60"
    }
  `}
          >
            <img src={FlameIcon} className="w-6 h-6 invert" />
          </button>
        </main>
      </div>
      <Analytics />
    </>
  );
}

export default App;
