import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    onError,
    className,
    width,
    height,
  }: {
    src: string;
    alt: string;
    onError?: () => void;
    className?: string;
    width?: number;
    height?: number;
  }) =>
    React.createElement("img", {
      src,
      alt,
      onError,
      className,
      width,
      height,
    }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useParams: () => ({}),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
});
