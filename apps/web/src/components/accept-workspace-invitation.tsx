"use client";

import { Button } from "@repo/ui/components/button";
import { captureException } from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { acceptInvitation } from "@/lib/actions/invitation-actions";

const AcceptWorkspaceInvitation = ({ invitationId }: { invitationId: string }) => {
  const { refresh } = useRouter();
  const [pending, setPending] = useState(false);
  const [acceptError, setError] = useState<string | null>(null);
  const handleAccept = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await acceptInvitation(invitationId);
      if (!result.success) {
        setError(result.error);
      }
      refresh();
    } catch (error) {
      captureException(error);
      setError("Couldn't accept the invitation. Please try again.");
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="flex flex-col gap-4 border-y border-border py-6">
      <p className="font-medium">You&apos;ve been invited to this workspace</p>
      {acceptError !== null && (
        <p className="text-sm text-destructive" role="alert">
          {acceptError}
        </p>
      )}
      <Button
        className="self-start"
        disabled={pending}
        onClick={() => {
          void handleAccept();
        }}
      >
        {pending ? "Accepting…" : "Accept invitation"}
      </Button>
    </div>
  );
};

export { AcceptWorkspaceInvitation };
