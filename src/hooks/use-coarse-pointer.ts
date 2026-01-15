"use client";

import { useEffect, useState } from "react";

export function useCoarsePointer() {
  const isClient = typeof window !== "undefined";
  const getIsCoarse = () =>
    isClient && window.matchMedia("(pointer: coarse)").matches;

  const [isCoarse, setIsCoarse] = useState(getIsCoarse());

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");

    const handleChange = (event: MediaQueryListEvent) => {
      setIsCoarse(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isCoarse;
}

export default useCoarsePointer;
