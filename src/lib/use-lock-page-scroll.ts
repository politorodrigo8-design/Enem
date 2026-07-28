"use client";

import { useEffect } from "react";

let lockCount = 0;
let previousRootOverflow = "";
let previousBodyOverflow = "";
let previousBodyPosition = "";
let previousBodyTop = "";
let previousBodyLeft = "";
let previousBodyRight = "";
let previousBodyWidth = "";
let lockedScrollY = 0;
let lockedScrollX = 0;

export function useLockPageScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const root = document.documentElement;
    const body = document.body;

    if (lockCount === 0) {
      previousRootOverflow = root.style.overflow;
      previousBodyOverflow = body.style.overflow;
      previousBodyPosition = body.style.position;
      previousBodyTop = body.style.top;
      previousBodyLeft = body.style.left;
      previousBodyRight = body.style.right;
      previousBodyWidth = body.style.width;
      lockedScrollY = window.scrollY;
      lockedScrollX = window.scrollX;
      root.style.overflow = "hidden";
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `-${lockedScrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        root.style.overflow = previousRootOverflow;
        body.style.overflow = previousBodyOverflow;
        body.style.position = previousBodyPosition;
        body.style.top = previousBodyTop;
        body.style.left = previousBodyLeft;
        body.style.right = previousBodyRight;
        body.style.width = previousBodyWidth;
        window.scrollTo({ top: lockedScrollY, left: lockedScrollX, behavior: "auto" });
      }
    };
  }, [locked]);
}
