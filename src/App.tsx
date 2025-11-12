import { sdk } from '@farcaster/miniapp-sdk'
import { useState, useEffect, useMemo } from 'react'
import GameBoard from './game/components/GameBoard'
import { useAccount, useConnect } from 'wagmi'
import LeaderboardIcon from './assets/leaderboard.svg'
import { fetchLeaderboard } from './game/lib/fetchLeaderboard'

function App() {
  const [ready, setReady] = useState(false)
  const [_isAppAdded, setIsAppAdded] = useState<boolean | null>(null);
  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(150)
  const [gameKey, setGameKey] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  const { isConnected } = useAccount()
  const { connect, connectors } = useConnect()

  // leaderboard states
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboard, setLeaderboard] = useState<{ wallet_address: string; score: number }[]>([])

  const handleOpenLeaderboard = async () => {
    setShowLeaderboard(true)
    const data = await fetchLeaderboard()
    setLeaderboard(data)
  }

  const handleCloseLeaderboard = () => {
    setShowLeaderboard(false)
  }

  useEffect(() => {
    (async () => {
      try {
        await sdk.actions.ready()
      } catch {}
      setReady(true)
        // Check if the miniapp is already added
        // sdk.context is a Promise that resolves to MiniAppContext
        const context = await sdk.context;
        setIsAppAdded(context.client?.added ?? false);
        if (!context.client?.added) {
          await sdk.actions.addMiniApp();
        }

    })()
  }, [])

  // Listen for miniapp added/removed events
  useEffect(() => {
    if (!ready) return;

    const handleMiniAppAdded = () => {
      setIsAppAdded(true);
    };

    const handleMiniAppRemoved = () => {
      setIsAppAdded(false);
    };

    // Listen for miniapp events
    // Using type assertion since TypeScript may not have these in the EventMap
    sdk.on("miniappAdded" as any, handleMiniAppAdded);
    sdk.on("miniappRemoved" as any, handleMiniAppRemoved);

    // Cleanup listeners
    return () => {
      sdk.off("miniappAdded" as any, handleMiniAppAdded);
      sdk.off("miniappRemoved" as any, handleMiniAppRemoved);
    };
  }, [ready]);


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

  useEffect(() => {
    let time = 150
    if (level > 30 && level <= 60) time = 90
    else if (level > 60 && level <= 90) time = 60
    else if (level > 90 && level <= 99) time = 45
    else if (level > 100 && level <= 110) time = 30
    else if (level > 111) time = 25
    setTimeLeft(time)
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

  const handleLevelComplete = () => {
    const nextLevel = level < 120 ? level + 1 : 1
    setScore((s) => s + 100)
    setLevel(nextLevel)
    setGameKey((k) => k + 1)
  }

  const handleScore = (points: number) => {
    setScore((s) => s + points)
  }

  const startGame = () => {
    setLevel(1)
    setScore(0)
    setTimeLeft(150)
    setGameKey((k) => k + 1)
    setIsPlaying(true)
    setIsPaused(false)
    setIsGameOver(false)
  }

  const handlePause = (paused: boolean) => {
    setIsPaused(paused)
  }

  if (!ready) return <div className="card">Loading...</div>;

  return (
    <div className="flex flex-col min-h-screen">
      {/* HEADER */}
      <header className="flex justify-between items-center py-2 px-12 bg-white/20 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Warplet Connect</h1>
          <span className="text-sm font-semibold text-white">[BETA]</span>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 p-2 flex flex-col items-center relative w-full">
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

        <div
          className={`transition-all duration-500 ${
            isPlaying ? isPaused : 'opacity-80 blur-sm pointer-events-none'
          }`}
        >
          <GameBoard
            key={gameKey}
            onComplete={handleLevelComplete}
            onPause={handlePause}
            onScore={handleScore}
            level={level}
            score={score}
          />
        </div>

        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-md rounded-lg p-6">
            <h2 className="text-3xl font-bold mb-4 text-white">Ready to Play?</h2>
            {!isConnected ? (
              <button
                onClick={connectFarcaster}
                className="relative px-6 py-3 bg-blue-600/30 backdrop-blur-md text-white rounded-lg text-lg font-bold border border-white/40 shadow-[0_0_10px_2px_rgba(255,255,255,0.5)] overflow-hidden transition"
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={startGame}
                className="relative px-6 py-3 bg-blue-600/30 backdrop-blur-md text-white rounded-lg text-lg font-bold border border-white/40 shadow-[0_0_10px_2px_rgba(255,255,255,0.5)] overflow-hidden transition"
              >
                Start New Game
              </button>
            )}
          </div>
        )}

        {!isPlaying && isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60">
            <h2 className="text-3xl font-bold mb-4 text-white">Game Over</h2>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-bold"
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
                onClick={handleCloseLeaderboard}
                className="mt-4 w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* FLOATING LEADERBOARD BUTTON */}
        <button
          onClick={handleOpenLeaderboard}
          className="fixed bottom-2 right-2 w-10 h-10 rounded-full bg-blue-600/40 backdrop-blur-md border border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.3)] hover:bg-blue-600/60 hover:shadow-[0_0_18px_rgba(255,255,255,0.6)] transition-all duration-300 flex items-center justify-center z-40"
        >
          <img src={LeaderboardIcon} alt="Leaderboard" className="w-6 h-6 invert" />
        </button>
      </main>

      {/* FOOTER */}
      <footer className="flex justify-center items-center py-3 px-12 bg-white/20 backdrop-blur-md shadow-lg">
        <p className="text-white text-sm font-semibold">
          © 2025 lether.base.eth All rights reserved.
        </p>
      </footer>
    </div>
  )
}

export default App
