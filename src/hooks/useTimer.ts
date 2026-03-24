import { useEffect, useRef, useCallback, useState } from 'react';

export function useTimer(isRunning: boolean, onTick?: () => void) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const onTickRef = useRef(onTick);

  onTickRef.current = onTick;

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setElapsed(0);
  }, [clearTimer]);

  const pause = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const resume = useCallback(() => {
    clearTimer();
    intervalRef.current = window.setInterval(() => {
      setElapsed((prev) => prev + 1);
      onTickRef.current?.();
    }, 1000);
  }, [clearTimer]);

  useEffect(() => {
    if (isRunning) {
      clearTimer();
      intervalRef.current = window.setInterval(() => {
        setElapsed((prev) => prev + 1);
        onTickRef.current?.();
      }, 1000);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [isRunning, clearTimer]);

  return { elapsed, reset, pause, resume };
}
