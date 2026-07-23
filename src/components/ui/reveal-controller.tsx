"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function revealAll(elements: HTMLElement[]) {
  for (const element of elements) {
    element.dataset.revealed = "true";
  }
}

const revealSelector = ".reveal-fx:not([data-revealed='true'])";

function getRevealElements(root: ParentNode = document) {
  const elements = Array.from(root.querySelectorAll<HTMLElement>(revealSelector));

  if (root instanceof HTMLElement && root.matches(revealSelector)) {
    elements.unshift(root);
  }

  return elements;
}

export function RevealController() {
  const pathname = usePathname();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealAll(getRevealElements());

      const fallbackObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
              revealAll(getRevealElements(node));
            }
          }
        }
      });

      fallbackObserver.observe(document.body, { childList: true, subtree: true });
      return () => fallbackObserver.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          element.dataset.revealed = "true";
          observer.unobserve(element);
        }
      },
      { threshold: 0.01, rootMargin: "0px 0px 160px 0px" },
    );

    function observePending(root?: ParentNode) {
      const elements = getRevealElements(root);
      for (const element of elements) {
        observer.observe(element);
      }
    }

    observePending();

    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            observePending(node);
          }
        }
      }
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
