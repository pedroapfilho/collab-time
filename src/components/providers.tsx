"use client";

import { RealtimeProvider } from "@upstash/realtime/client";

type ProvidersProps = {
  children: React.ReactNode;
};

const Providers = ({ children }: ProvidersProps) => {
  return <RealtimeProvider>{children}</RealtimeProvider>;
};

export { Providers };
