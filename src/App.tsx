import React, { useState, useEffect } from 'react';
import Logo from './assets/logo.svg';
import GameBoard from './game/components/GameBoard';

function App() {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(150);
  const [gameKey, setGameKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // set waktu tiap level
  useEffect(() => {
    let time = 150;
    if (level > 30 && level <= 60) time = 90;
    else if (level > 60 && level <= 90) time = 60;
    else if (level > 90  && level <= 99) time = 45;
    else if (level > 100  && level <= 110) time = 30;
    else if (level > 111) time = 25;
    setTimeLeft(time);
  }, [level]);

  // countdown
  useEffect(() => {
    if (!isPlaying || isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, isPaused, gameKey]);

  // waktu habis
  useEffect(() => {
    if (timeLeft === 0 && isPlaying && !isPaused) {
      setIsPlaying(false);
      setIsGameOver(true);
      setLevel(1);
      setScore(0);
    }
  }, [timeLeft, isPlaying, isPaused]);

  // level selesai
  const handleLevelComplete = () => {
    const nextLevel = level < 120 ? level + 1 : 1;
    setScore((s) => s + 100);
    setLevel(nextLevel);
    setGameKey((k) => k + 1);

    let nextTime = 150;
    if (nextLevel > 30 && nextLevel <= 60) nextTime = 90;
    else if (nextLevel > 60 && nextLevel <= 90) nextTime = 60;
    else if (nextLevel > 90 && nextLevel <= 99) nextTime = 45;
    else if (nextLevel > 100 && nextLevel <= 110) nextTime = 30;
    else if (nextLevel > 111) nextTime = 25;
    setTimeLeft(nextTime);
  };

  // mulai ulang game
  const startGame = () => {
    setLevel(1);
    setScore(0);
    setTimeLeft(150);
    setGameKey((k) => k + 1);
    setIsPlaying(true);
    setIsPaused(false);
    setIsGameOver(false);
  };

  const handlePause = (paused: boolean) => {
    setIsPaused(paused);
  };

  return (
    <>
      <header className="flex justify-center items-center py-3 px-12 bg-white/20 backdrop-blur-md shadow-lg">
  <div className="flex items-center gap-4">
    <h1 className="text-2xl font-bold text-white">Warplet Connect</h1>
  </div>
</header>


      <main className="h-[90vh] p-4 flex flex-col items-center relative">
      <div className="flex justify-between w-full max-w-md mb-3 gap-3">
  <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-lg shadow-md flex items-center">
    <span className="text-white text-lg font-bold">Level: {level}</span>
  </div>
  <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-lg shadow-md flex items-center">
    <span className="text-white text-lg font-bold">Score: {score}</span>
  </div>
  <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-lg shadow-md flex items-center">
    <span className="text-white text-lg font-bold">Time: {timeLeft}s</span>
  </div>
</div>


        <div
          className={`transition-all duration-500 ${
            isPlaying
              ? isPaused
                : 'opacity-80 blur-sm pointer-events-none'
          }`}
        >
          <GameBoard
            key={gameKey}
            onComplete={handleLevelComplete}
            onPause={handlePause}
          />
        </div>

        {/* Overlay Start */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-md rounded-lg p-6">
          <h2 className="text-3xl font-bold mb-4 text-white">Ready to Play?</h2>
          <button
  onClick={startGame}
  className="relative px-6 py-3 bg-blue-600/30 backdrop-blur-md text-white rounded-lg text-lg font-bold border border-white/40 shadow-[0_0_10px_2px_rgba(255,255,255,0.5)] overflow-hidden transition"
>
  Start New Game
</button>

        </div>
        
        )}

        {/* Overlay Game Over */}
        {!isPlaying && isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60">
            <h2 className="text-3xl font-bold mb-4">Game Over</h2>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-bold"
            >
              Start New Game
            </button>
          </div>
        )}
      </main>

      <footer className="flex justify-center items-center py-3 px-12 bg-white/20 backdrop-blur-md shadow-lg">
  <div className="flex items-center gap-4">
    <p className="text-white text-sm font-semibold">&copy; 2025 lether.base.eth All rights reserved.</p>
  </div>
</footer>


    </>
  );
}

export default App;