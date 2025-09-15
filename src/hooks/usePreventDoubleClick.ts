import { useRef } from "react";

type Callback = (...args: any[]) => void | Promise<void>;

export function usePreventDoubleClick<T extends Callback>(
  callback?: T
): T | undefined {
  const isRunning = useRef(false);

  if (!callback) return undefined;

  const wrapped = (async (...args: any[]) => {
    if (isRunning.current) return; // ⛔ ignora click se già in esecuzione
    isRunning.current = true;

    try {
      await callback(...args);
    } finally {
      isRunning.current = false; // ✅ si sblocca quando la Promise è risolta
    }
  }) as T;

  return wrapped;
}
