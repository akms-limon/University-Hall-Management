import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (!global.ResizeObserver) {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

vi.mock("framer-motion", () => {
  const motion = new Proxy(
    {},
    {
      get(_target, tag) {
        return React.forwardRef(function MockMotionComponent({ children, ...props }, ref) {
          return React.createElement(tag, { ref, ...props }, children);
        });
      },
    }
  );

  return {
    motion,
    AnimatePresence: ({ children }) => children,
  };
});
