"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTransition } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import type { TeamRole } from "@/types";
import { authenticateTeam } from "@/lib/actions";
import { PasswordSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

type TeamAuthDialogProps = {
  open: boolean;
  teamId: string;
  onAuthenticated: (data: { token: string; role: TeamRole }) => void;
};

const formSchema = z.object({
  password: PasswordSchema,
});

type FormValues = z.infer<typeof formSchema>;

const TeamAuthDialog = ({ open, teamId, onAuthenticated }: TeamAuthDialogProps) => {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      password: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await authenticateTeam(teamId, values.password);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onAuthenticated({
        token: result.data.token,
        role: result.data.role,
      });
    });
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm bg-white dark:bg-neutral-900">
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-neutral-900 dark:text-neutral-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 dark:bg-neutral-100">
                  <Lock className="h-5 w-5 text-white dark:text-neutral-900" />
                </div>
                Enter workspace password
              </DialogTitle>
              <DialogDescription>
                Ask the workspace admin for either the admin password (full access) or
                the member password (view only).
                </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Controller
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="team-password">Password</FieldLabel>
                    <Input
                      {...field}
                      id="team-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      disabled={isPending}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={isPending || !form.formState.isValid}>
                {isPending ? (
                  <>
                    <Spinner className="mr-2" />
                    Checking…
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
};

export { TeamAuthDialog };
