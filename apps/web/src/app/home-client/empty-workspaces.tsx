import { STEPS } from "@/components/landing/how-it-works";

const EmptyWorkspaces = () => (
  <section className="flex w-full flex-col">
    <div className="border-b border-border pb-3">
      <h2 className="font-display text-sm font-semibold tracking-[0.08em] text-foreground uppercase">
        Workspaces
      </h2>
    </div>
    <div className="flex min-h-24 flex-col justify-center gap-1 border-b border-border py-5">
      <p className="font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
        No workspaces yet
      </p>
      <p className="max-w-prose text-sm text-pretty text-muted-foreground">
        Create one above to put your team on a single timeline. You are added with your local
        timezone, and you can invite everyone else in a minute.
      </p>
    </div>
    <ol className="grid list-decimal gap-x-10 gap-y-8 pt-8 pl-5 sm:grid-cols-3">
      {STEPS.map(({ body, title }) => (
        <li className="pl-2 marker:font-display marker:text-muted-foreground" key={title}>
          <p className="font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm text-pretty text-muted-foreground">{body}</p>
        </li>
      ))}
    </ol>
  </section>
);

export { EmptyWorkspaces };
