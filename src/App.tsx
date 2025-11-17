import { sdk } from '@farcaster/miniapp-sdk'
import { useState, useEffect, useMemo } from 'react'
import GameBoard from './game/components/GameBoard'
import { useAccount, useConnect, useSendCalls} from 'wagmi'
import LeaderboardIcon from './assets/leaderboard.svg'
import FlameIcon from './assets/flame.svg'
import { fetchLeaderboard } from './game/lib/fetchLeaderboard'
import { Analytics } from '@vercel/analytics/react'
import { parseEther, encodeFunctionData, parseUnits } from 'viem';
import { BACKGROUNDS } from "./backgrounds";

// Uniswap V2 Router ABI (minimal - only swapETHForExactTokens function)
const uniswapRouterAbi = [
  {
    inputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" }
    ],
    name: "swapETHForExactTokens",
    outputs: [
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" }
    ],
    stateMutability: "payable",
    type: "function"
  }
];

type StreakData = {
  streak: number
  signed_today: boolean
}

function App() {
  const [ready, setReady] = useState(false)
  const [_isAppAdded, setIsAppAdded] = useState<boolean | null>(null)

  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(150)
  const [gameKey, setGameKey] = useState(0)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  const { isConnected, address } = useAccount()
  const { connect, connectors } = useConnect()

  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboard, setLeaderboard] = useState<{ wallet_address: string; score: number }[]>([])

  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [streak, setStreak] = useState(0)
  const [signedToday, setSignedToday] = useState(false)
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
    () => connectors.find((c) => c.name.toLowerCase().includes('farcaster')),
    [connectors]
  )

  const connectFarcaster = async () => {
    if (!fcConnector) return
    try {
      await connect({ connector: fcConnector })
    } catch (e) {
      console.error(e)
    }
  }

  const { sendCalls } = useSendCalls();

  const handleSwap = async () => {
    if (!address) return console.error('No wallet connected');
  
    try {
      const amountOut = parseUnits('0.01', 6); // 0.01 USDC
      const path = [
        '0x4200000000000000000000000000000000000006', // WETH on Base
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC on Base
      ] as const;
      const to = address;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 10);
  
      const data = encodeFunctionData({
        abi: uniswapRouterAbi,
        functionName: 'swapETHForExactTokens',
        args: [amountOut, path, to, deadline]
      });
  
      await sendCalls({
        calls: [
          {
            to: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24', // Uniswap V2/V3 router on Base
            data,
            value: parseEther('0.000005') // max ETH to spend
          }
        ]
      });
  
      console.log('✅ Swap transaction sent');
      await signToday();

    } catch (error) {
      console.error('❌ Swap failed:', error);
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
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ wallet: address })
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
  }, [isConnected, address, showDailyStreak])

  const signToday = async () => {
    if (!address || signedToday) return
  
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-streak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ wallet: address })
      })
  
      const data: StreakData = await res.json()
  
      setStreak(data.streak)
      setSignedToday(data.signed_today)
    } catch (err) {
      console.error("Failed sign today:", err)
    }
  }
  

  // INITIALIZE FARCASTER
  useEffect(() => {
    ;(async () => {
      try {
        await sdk.actions.ready()
      } catch {}

      setReady(true)
      const context = await sdk.context

      setIsAppAdded(context.client?.added ?? false)
      if (!context.client?.added) {
        await sdk.actions.addMiniApp()
      }
    })()
  }, [])

  // GAME LOGIC
  useEffect(() => {
    let t = 150
    if (level > 30 && level <= 60) t = 90
    else if (level > 60 && level <= 90) t = 60
    else if (level > 90 && level <= 99) t = 45
    else if (level > 100 && level <= 110) t = 30
    else if (level > 111) t = 25
    setTimeLeft(t)
  }, [level])

  useEffect(() => {
    if (!isPlaying || isPaused) return
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [isPlaying, isPaused, gameKey])

  useEffect(() => {
    if (timeLeft === 0 && isPlaying && !isPaused) {
      setIsPlaying(false)
      setIsGameOver(true)
      setLevel(1)
      setScore(0)
    }
  }, [timeLeft, isPlaying, isPaused])

  const startGame = () => {
    const random = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    setBg(random);

    setLevel(1)
    setScore(0)
    setTimeLeft(150)
    setGameKey((k) => k + 1)
    setIsPlaying(true)
    setIsPaused(false)
    setIsGameOver(false)
  }

  const handleScore = (p: number) => setScore((s) => s + p)
  const handlePause = (v: boolean) => setIsPaused(v)
  const handleLevelComplete = () => {
    const next = level < 120 ? level + 1 : 1

    const random = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    setBg(random);

    setScore((s) => s + 100)
    setLevel(next)
    setGameKey((k) => k + 1)
  }

  const openLeaderboard = async () => {
    setShowLeaderboard(true)
    const data = await fetchLeaderboard()
    setLeaderboard(data)
  }

  if (!ready) return <div className="card">Loading...</div>

  return (
    <>
      <div className="flex flex-col min-h-screen" style={{ backgroundImage: isPlaying && bg ? `url(${bg})` : "none", backgroundRepeat: "no-repeat", backgroundSize: "cover", backgroundPosition: "center" }} >

        {/* HEADER */}
        <header className="flex justify-between items-center py-2 px-12 bg-white/20 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Warplet Connect</h1>
            <span className="text-sm font-semibold text-white">[BETA]</span>
          </div>

          {/* STREAK + FLAME */}
          {isConnected && (
            <div className="flex items-center gap-1 text-white text-lg font-bold">
              <img src={FlameIcon} className="w-5 h-5" />
              <span>{streak}</span>
            </div>
          )}
        </header>

        {/* MAIN */}
        <main className="flex-1 p-2 flex flex-col items-center relative w-full">

          {/* TOP INFO */}
          <div className="flex justify-between w-full max-w-md gap-3 mb-4">
            <div className="px-4 bg-white/20 backdrop-blur-md rounded-lg shadow-md flex items-center">
              <span className="text-white text-sm font-bold">Level: {level}</span>
            </div>
            <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-lg shadow-md flex items-center">
              <span className="text-white text-sm font-bold">Score: {score}</span>
            </div>
            <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-lg shadow-md flex items-center">
              <span className="text-white text-sm font-bold">Time: {timeLeft}s</span>
            </div>
          </div>

          {/* GAME BOARD */}
          <div className={`transition-all duration-500 ${isPlaying ? isPaused : 'opacity-80 blur-sm pointer-events-none'}`}>
            <div className="flex justify-center items-center w-full">
              <div className="relative w-full max-w-sm aspect-square">
              {isPlaying && (
<GameBoard key={gameKey} onComplete={handleLevelComplete} onPause={handlePause} onScore={handleScore} level={level} score={score} />
)}
              </div>
            </div>
          </div>

          {/* START SCREEN */}
          {/* START SCREEN */}
{!isPlaying && !isGameOver && (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-md rounded-lg p-6">
    <h2 className="text-3xl font-bold mb-4 text-white">Ready to Play?</h2>

    {!isConnected ? (
      <button
        onClick={connectFarcaster}
        className="px-6 py-3 bg-blue-600/30 backdrop-blur-md text-white rounded-lg text-lg font-bold border border-white/40 shadow transition"
      >
        Sign In
      </button>
    ) : (
      <div className="flex flex-col items-center gap-3">

        <button
          onClick={startGame}
          className="px-6 py-3 bg-blue-600/30 backdrop-blur-md text-white rounded-lg text-lg font-bold border border-white/40 shadow transition"
        >
          Start New Game
        </button>

        <button
          onClick={() => setShowHowToPlay(true)}
          className="px-6 py-3 bg-blue-600/30 backdrop-blur-md text-white rounded-lg text-lg font-bold border border-white/40 shadow transition"
        >
          How To Play
        </button>

        <button
  onClick={() => {
    if (!signedToday) setShowDailyStreak(true)
  }}
  disabled={signedToday}
  className={`px-6 py-3 rounded-lg text-lg font-bold border border-white/40 shadow transition 
    ${signedToday ? "bg-gray-500/30 cursor-not-allowed opacity-50" : "bg-orange-600/30 text-white"}
  `}
>
  Daily Streak
</button>

      </div>
    )}
  </div>
)}


          {/* GAME OVER */}
          {!isPlaying && isGameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60">
              <h2 className="text-3xl font-bold mb-4 text-white">Game Over</h2>
              <button
                onClick={startGame}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-bold"
              >
                Start New Game
              </button>
            </div>
          )}

          {/* LEADERBOARD MODAL */}
          {showLeaderboard && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 z-50">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-80 max-h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-center mb-4 text-white">Leaderboard</h2>
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
                  className="mt-4 w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* HOW TO PLAY MODAL */}
          {showHowToPlay && (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 z-50">
    <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-80 max-h-[80vh] overflow-y-auto text-white">

      {/* TOP RIGHT CLOSE (X) */}
      <button
        onClick={() => setShowHowToPlay(false)}
        className="absolute top-2 right-2 text-white text-xl font-bold"
      >
        ×
      </button>

      <h2 className="text-xl font-bold text-center mb-4">How to Play</h2>

      <div className="text-white text-sm space-y-4">
        <ul className="list-disc list-inside space-y-2">
          <li>You connect two matching icons.</li>
          <li>A valid path has zero, one, or two turns.</li>
          <li>You clear tiles to finish the level.</li>
          <li>Your time depends on your level.</li>
          <li>You get points for every match and level.</li>
        </ul>

        <img
          src="/src/assets/guide.png"
          alt="How to play guide"
          className="w-full rounded-lg shadow-md"
        />
      </div>

      {/* BOTTOM CLOSE BUTTON */}
      <button
        onClick={() => setShowHowToPlay(false)}
        className="mt-4 w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition"
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

      <h2 className="text-xl font-bold text-center mb-4 text-white">Daily Streak</h2>

      <div className="flex items-center justify-center gap-2 mb-4">
        <img src={FlameIcon} className="w-6 h-6" />
        <span className="text-white text-lg font-bold">{streak}</span>
      </div>

      <button
      onClick={handleSwap}
  className={`w-full py-3 rounded-lg font-bold transition ${
    signedToday ? 'bg-gray-500 cursor-not-allowed' : 'bg-orange-600'
  }`}
>
  {signedToday ? 'Signed Today' : 'Sign Today'}
</button>

    </div>
  </div>
)}


          {/* FLOATING BUTTON */}
          <button
            onClick={openLeaderboard}
            className="fixed bottom-2 right-2 w-10 h-10 rounded-full bg-blue-600/40 backdrop-blur-md border border-white/30 shadow hover:bg-blue-600/60 transition flex items-center justify-center z-40"
          >
            <img src={LeaderboardIcon} className="w-6 h-6 invert" />
          </button>

          <button
  onClick={() => {
    if (!signedToday) setShowDailyStreak(true)
  }}
  disabled={signedToday}
  className={`fixed bottom-2 left-2 w-10 h-10 rounded-full backdrop-blur-md border border-white/30 shadow transition flex items-center justify-center z-40
    ${signedToday ? "bg-gray-500/40 cursor-not-allowed opacity-50" : "bg-orange-600/40 hover:bg-orange-600/60"}
  `}
>
  <img src={FlameIcon} className="w-6 h-6 invert" />
</button>


        </main>

        <footer className="flex justify-center items-center py-3 px-12 bg-white/20 backdrop-blur-md shadow-lg">
          <p className="text-white text-sm font-semibold">
            © 2025 lether.base.eth All rights reserved.
          </p>
        </footer>

      </div>
      <Analytics />
    </>
  )
}

export default App
