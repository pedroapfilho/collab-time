import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AcceptWorkspaceInvitation } from "./accept-workspace-invitation";

const mocks = vi.hoisted(() => ({ acceptInvitation: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/actions/invitation-actions", () => ({ acceptInvitation: mocks.acceptInvitation }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("invitation acceptance", () => {
  it("refreshes membership and workspace data after acceptance", async () => {
    mocks.acceptInvitation.mockResolvedValue({ data: { teamId: "team-1" }, success: true });
    render(<AcceptWorkspaceInvitation invitationId="invite-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => {
      expect(mocks.refresh).toHaveBeenCalledOnce();
    });
    expect(mocks.acceptInvitation).toHaveBeenCalledWith("invite-1");
  });

  it.each(["This invitation is not for you", "This invitation is no longer pending"])(
    "shows the server rejection: %s",
    async (error) => {
      mocks.acceptInvitation.mockResolvedValue({ error, success: false });
      render(<AcceptWorkspaceInvitation invitationId="invite-1" />);
      fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(error);
      expect(mocks.refresh).toHaveBeenCalledOnce();
    },
  );
});
