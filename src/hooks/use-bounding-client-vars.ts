import { useEffect, useRef } from "react";

export function useBoundingClientCustomProperties(prefix: string) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      document.documentElement.style.setProperty(`--${prefix}-w`, `${width}px`);
      document.documentElement.style.setProperty(
        `--${prefix}-h`,
        `${height}px`,
      );
    });

    ro.observe(el);

    const { width, height } = el.getBoundingClientRect();
    document.documentElement.style.setProperty(`--${prefix}-w`, `${width}px`);
    document.documentElement.style.setProperty(`--${prefix}-h`, `${height}px`);

    return () => ro.disconnect();
  }, [prefix]);

  return ref;
}
