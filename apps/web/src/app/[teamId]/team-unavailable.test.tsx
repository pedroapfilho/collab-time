import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { TeamUnavailable } from "./team-unavailable";

it("offers retry and navigation after a failed load", () => {
  const retry = vi.fn<() => void>();
  const { rerender } = render(<TeamUnavailable message="Storage unavailable" onRetry={retry} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Storage unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledOnce();
  expect(screen.getByRole("link", { name: "Back to workspaces" })).toHaveAttribute("href", "/");
  rerender(<TeamUnavailable isRetrying message="Storage unavailable" onRetry={retry} />);
  expect(screen.getByRole("button", { name: "Trying again…" })).toBeDisabled();
});
