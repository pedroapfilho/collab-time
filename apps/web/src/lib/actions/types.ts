type ActionResult<T> =
  | {
      data: T;
      success: true;
    }
  | {
      error: string;
      success: false;
    };

type ActionErrorEvent = {
  error?: unknown;
  invitationId?: string;
  memberId?: string;
  message: string;
  reason?: string;
  requestId?: string;
  route: string;
  teamId?: string;
  userId?: string;
};

export type { ActionErrorEvent, ActionResult };
