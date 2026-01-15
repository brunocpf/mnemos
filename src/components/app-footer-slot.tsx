"use client";

import { PropsWithChildren, startTransition, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function AppFooterSlot({ children }: PropsWithChildren) {
  const [slotElement, setSlotElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = document.getElementById("app-footer-slot");

    startTransition(() => {
      setSlotElement(element);
    });
  }, []);

  if (!slotElement) {
    return null;
  }

  return createPortal(children, slotElement);
}
