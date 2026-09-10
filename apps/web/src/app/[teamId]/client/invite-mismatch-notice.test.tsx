import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { InviteMismatchNoticeView } from "./invite-mismatch-notice";

it("explains the email mismatch and invokes account switching", () => {
  const onSwitchAccount = vi.fn<() => void>();
  render(
    <InviteMismatchNoticeView
      invitedEmailMasked="f***@example.com"
      onSwitchAccount={onSwitchAccount}
      pending={false}
    />,
  );
  expect(screen.getByText(/This invitation was sent to f\*\*\*@example.com/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Switch account" }));
  expect(onSwitchAccount).toHaveBeenCalledOnce();
});
