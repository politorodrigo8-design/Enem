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

    // Rede de segurança: o conteúdo nasce com opacity 0 e só aparece quando o
    // observer marca. Se o callback não rodar (aba em segundo plano, navegador
    // que engasga, extensão que interfere), a tela ficaria permanentemente em
    // branco. Passado o tempo da animação, revela o que já está visível — o que
    // continua abaixo da dobra segue esperando o scroll, como desenhado. A
    // entrada é enfeite; a legibilidade não é negociável.
    const safetyNet = window.setTimeout(() => {
      const pendingInViewport = getRevealElements().filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });
      revealAll(pendingInViewport);
    }, 1200);

    return () => {
      window.clearTimeout(safetyNet);
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
