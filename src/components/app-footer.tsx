"use client";

import { VisualViewportBottomAnchor } from "@/components/visual-viewport-bottom-anchor";
import { useBoundingClientCustomProperties } from "@/hooks/use-bounding-client-vars";

export function AppFooter() {
  const ref = useBoundingClientCustomProperties("mn-footer");

  return (
    <VisualViewportBottomAnchor
      ref={ref}
      Component="footer"
      className="right-0 left-0 z-50 w-full pb-[max(calc(var(--spacing)*4),env(safe-area-inset-bottom))] text-sm [view-transition-class:fixed] [view-transition-name:app-footer]"
    >
      <div className="bg-background/95 absolute inset-0 mask-[linear-gradient(to_top,black,rgba(1,1,1,0.9),rgba(1,1,1,0.01))] backdrop-blur-xs" />
      <div id="app-footer-slot" />
    </VisualViewportBottomAnchor>
  );
}
