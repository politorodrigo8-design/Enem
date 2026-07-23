"use client";

import { useEffect } from "react";

let lockCount = 0;
let previousRootOverflow = "";
let previousBodyOverflow = "";

export function useLockPageScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const root = document.documentElement;
    const body = document.body;

    if (lockCount === 0) {
      previousRootOverflow = root.style.overflow;
      previousBodyOverflow = body.style.overflow;
      root.style.overflow = "hidden";
      body.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        root.style.overflow = previousRootOverflow;
        body.style.overflow = previousBodyOverflow;
      }
    };
  }, [locked]);
}
