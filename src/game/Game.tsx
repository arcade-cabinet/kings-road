import { useEffect } from 'react';
import { GameScene } from './components/GameScene';
import { DialogueBox } from './components/ui/DialogueBox';
import { GameHUD } from './components/ui/GameHUD';
import { LoadingOverlay } from './components/ui/LoadingOverlay';
import { MainMenu } from './components/ui/MainMenu';
import { MobileControls } from './components/ui/MobileControls';
import { QuestLog } from './components/ui/QuestLog';
import {
  useKeyboardInput,
  useMouseInput,
  useTouchInput,
} from './hooks/useInput';

function InputHandlers() {
  useKeyboardInput();
  useMouseInput();
  useTouchInput();
  return null;
}

export function Game() {
  // Prevent default touch behaviors
  useEffect(() => {
    const preventDefaults = (e: TouchEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('button')) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventDefaults, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventDefaults);
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* Input handling */}
      <InputHandlers />

      {/* 3D Scene */}
      <GameScene />

      {/* UI Layers */}
      <MainMenu />
      <LoadingOverlay />
      <GameHUD />
      <DialogueBox />
      <QuestLog />
      <MobileControls />
    </div>
  );
}

export default Game;
