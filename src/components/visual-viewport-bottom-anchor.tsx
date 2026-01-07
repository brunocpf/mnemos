"use client";

import {
  type PropsWithChildren,
  RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import useCoarsePointer from "@/hooks/use-coarse-pointer";
import { cn } from "@/lib/utils";

export interface VisualViewportBottomAnchorProps {
  Component?: React.ElementType;
  scrollBehavior?: "close-keyboard" | "hide-on-scroll";
  className?: string;
  ref?: RefObject<HTMLElement | null>;
}

// Inspired by: https://github.com/almond-bongbong/react-bottom-fixed
export function VisualViewportBottomAnchor({
  Component = "div",
  scrollBehavior = "hide-on-scroll",
  className,
  children,
  ref,
}: PropsWithChildren<VisualViewportBottomAnchorProps>) {
  const isCoarsePointer = useCoarsePointer();
  const anchorRef = useRef<HTMLElement | null>(null);
  const [isHide, setIsHide] = useState(false);

  useEffect(() => {
    const anchorElement = anchorRef.current;
    const { visualViewport } = window;

    if (!anchorElement || !visualViewport) {
      return;
    }

    let isKeyboardVisible = false;
    let isKeyboardVisibleWithDelay = false;
    let hasScroll = false;

    const adjustAnchorPosition = (keyboardHeight = 0) => {
      if (anchorRef.current) {
        anchorRef.current.style.transform = `translateY(-${keyboardHeight || 0}px)`;
      }
    };

    const viewportChangeHandler = () => {
      if (!visualViewport) return;

      const scrollY = window.scrollY;

      const heightGap = Math.max(
        0,
        document.documentElement.clientHeight - window.innerHeight,
      );

      const bottomPosition = hasScroll
        ? window.innerHeight -
          (visualViewport.height + visualViewport.offsetTop - heightGap)
        : window.innerHeight -
          (visualViewport.height + visualViewport.offsetTop) +
          scrollY;

      if (!isKeyboardVisible) {
        return;
      }

      adjustAnchorPosition(bottomPosition);
    };

    visualViewport?.addEventListener("resize", viewportChangeHandler, {
      passive: true,
    });
    visualViewport?.addEventListener("scroll", viewportChangeHandler, {
      passive: true,
    });

    viewportChangeHandler();

    let keyboardVisibleDelayTimer: number | null = null;

    const focusinHandler = () => {
      hasScroll = document.documentElement.scrollHeight > window.innerHeight;
      isKeyboardVisible = true;

      if (keyboardVisibleDelayTimer)
        window.clearTimeout(keyboardVisibleDelayTimer);

      keyboardVisibleDelayTimer = window.setTimeout(() => {
        isKeyboardVisibleWithDelay = true;
      }, 500);

      viewportChangeHandler();
    };

    const focusoutHandler = () => {
      window.requestAnimationFrame(() => adjustAnchorPosition(0));

      isKeyboardVisible = false;
      isKeyboardVisibleWithDelay = false;
      if (keyboardVisibleDelayTimer)
        window.clearTimeout(keyboardVisibleDelayTimer);
    };

    window.addEventListener("focusin", focusinHandler, { passive: true });
    window.addEventListener("focusout", focusoutHandler, { passive: true });

    let timer: number | null = null;
    let isTouching = false;
    let lastTouchY = 0;
    let touchStartY = 0;

    const handleTouchStart = (event: TouchEvent) => {
      isTouching = true;
      touchStartY = event.touches[0].clientY;
      lastTouchY = touchStartY;
    };

    const handleTouchEnd = () => {
      isTouching = false;

      if (!isKeyboardVisibleWithDelay) return;
      if (timer) window.clearTimeout(timer);

      timer = window.setTimeout(() => setIsHide(false), 100);
    };

    const handleScrollOrTouchMove = () => {
      if (!isCoarsePointer) return;
      if (!isKeyboardVisibleWithDelay) return;
      if (timer) window.clearTimeout(timer);

      if (scrollBehavior === "close-keyboard") {
        if (
          isKeyboardVisible &&
          document.activeElement instanceof HTMLElement
        ) {
          document.activeElement.blur();
        }
        return;
      }

      setIsHide(true);

      if (isTouching) return;

      timer = window.setTimeout(() => setIsHide(false), 200);
    };

    const handleScroll = () => {
      handleScrollOrTouchMove();
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isTouching || !isKeyboardVisibleWithDelay) return;

      const currentTouchY = event.touches[0].clientY;
      const deltaY = Math.abs(currentTouchY - lastTouchY);
      const totalDeltaY = Math.abs(currentTouchY - touchStartY);

      if (deltaY > 5 || totalDeltaY > 10) {
        handleScrollOrTouchMove();
      }

      lastTouchY = currentTouchY;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      visualViewport?.removeEventListener("resize", viewportChangeHandler);
      visualViewport?.removeEventListener("scroll", viewportChangeHandler);
      window.removeEventListener("focusin", focusinHandler);
      window.removeEventListener("focusout", focusoutHandler);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isCoarsePointer, scrollBehavior]);

  return (
    <Component
      ref={(el: HTMLElement | null) => {
        anchorRef.current = el;

        if (ref !== undefined) {
          ref.current = el;
        }
      }}
      className={cn(
        "fixed bottom-0 opacity-100 will-change-transform [transition:opacity_100ms_ease-out,transform_100ms_ease-out]",
        {
          "pointer-events-none opacity-0": isHide,
        },
        className,
      )}
    >
      {children}
    </Component>
  );
}
