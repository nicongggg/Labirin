import { useState } from 'react';
import MainMenu from './components/MainMenu';
import MazeGame3D from './components/MazeGame3D';
import { GameState } from './types';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');

  return (
    <div className="w-full h-screen bg-black overflow-hidden font-sans select-none">
      {gameState === 'MENU' ? (
        <MainMenu onStartGame={() => setGameState('PLAYING')} />
      ) : (
        <MazeGame3D onBackToMenu={() => setGameState('MENU')} />
      )}
    </div>
  );
}
