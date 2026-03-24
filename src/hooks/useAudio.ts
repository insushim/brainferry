import { useCallback } from 'react';
import { soundEngine, SoundEngine } from '@/lib/audio/sound-engine';
import { useUIStore } from '@/stores/ui-store';

type SoundMethod = {
  [K in keyof SoundEngine]: SoundEngine[K] extends () => void
    ? K extends `play${string}`
      ? K
      : never
    : never;
}[keyof SoundEngine];

function makePlayer(soundEnabled: boolean, volume: number, method: SoundMethod) {
  return () => {
    if (!soundEngine || !soundEnabled) return;
    soundEngine.setEnabled(true);
    soundEngine.setVolume(volume);
    soundEngine[method]();
  };
}

export function useAudio() {
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const volume = useUIStore((s) => s.volume);

  const playSplash = useCallback(() => makePlayer(soundEnabled, volume, 'playSplash')(), [soundEnabled, volume]);
  const playSuccess = useCallback(() => makePlayer(soundEnabled, volume, 'playSuccess')(), [soundEnabled, volume]);
  const playError = useCallback(() => makePlayer(soundEnabled, volume, 'playError')(), [soundEnabled, volume]);
  const playClick = useCallback(() => makePlayer(soundEnabled, volume, 'playClick')(), [soundEnabled, volume]);
  const playPour = useCallback(() => makePlayer(soundEnabled, volume, 'playPour')(), [soundEnabled, volume]);
  const playPlace = useCallback(() => makePlayer(soundEnabled, volume, 'playPlace')(), [soundEnabled, volume]);
  const playHint = useCallback(() => makePlayer(soundEnabled, volume, 'playHint')(), [soundEnabled, volume]);
  const playTick = useCallback(() => makePlayer(soundEnabled, volume, 'playTick')(), [soundEnabled, volume]);
  const playScale = useCallback(() => makePlayer(soundEnabled, volume, 'playScale')(), [soundEnabled, volume]);
  const playToggle = useCallback(() => makePlayer(soundEnabled, volume, 'playToggle')(), [soundEnabled, volume]);

  return {
    playSplash,
    playSuccess,
    playError,
    playClick,
    playPour,
    playPlace,
    playHint,
    playTick,
    playScale,
    playToggle,
  };
}
