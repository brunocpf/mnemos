"use client";

import { PropsWithChildren, startTransition, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function AppHeaderContentSlot({ children }: PropsWithChildren) {
  const [slotElement, setSlotElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = document.getElementById("app-header-content-slot");

    startTransition(() => {
      setSlotElement(element);
    });
  }, []);

  if (!slotElement) {
    return null;
  }

  return createPortal(children, slotElement);
}
