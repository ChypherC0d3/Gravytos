import { useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '@gravytos/state';

export function useAutoLock(onLock: () => void) {
  const autoLockTimeout = useSettingsStore((s) => s.autoLockTimeout); // minutes
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimer = useCallback(() => {
    if (autoLockTimeout <= 0) return; // disabled
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onLock();
    }, autoLockTimeout * 60 * 1000);
  }, [autoLockTimeout, onLock]);

  useEffect(() => {
    if (autoLockTimeout <= 0) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // Start initial timer

    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoLockTimeout, resetTimer]);
}
