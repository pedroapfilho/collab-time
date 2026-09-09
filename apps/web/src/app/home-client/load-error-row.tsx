import { Button } from "@repo/ui/components/button";

type LoadErrorRowProps = {
  label: string;
  onRetry: () => void;
};

const LoadErrorRow = ({ label, onRetry }: LoadErrorRowProps) => (
  <div
    className="flex min-h-24 items-center justify-between gap-4 border-b border-border py-5"
    role="alert"
  >
    <div className="flex flex-col gap-1">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
    </div>
    <Button onClick={onRetry} size="sm" variant="outline">
      Try again
    </Button>
  </div>
);

export { LoadErrorRow };
