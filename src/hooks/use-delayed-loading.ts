import { startTransition, useEffect, useState } from "react";

export function useDelayedLoading(
  isLoading: boolean,
  delayMs: number = 300,
): boolean {
  const [showLoading, setShowLoading] = useState<boolean>(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (isLoading) {
      timer = setTimeout(() => {
        setShowLoading(true);
      }, delayMs);
    } else {
      startTransition(() => {
        setShowLoading(false);
      });
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, delayMs]);

  return showLoading;
}
