"use client";

import { NhostProvider as NhostReactProvider } from "@nhost/nextjs";
import { nhost } from "@/lib/nhost";
import { ReactNode } from "react";

export function NhostProvider({ children }: { children: ReactNode }) {
  return (
    <NhostReactProvider nhost={nhost} initial={undefined}>
      {children}
    </NhostReactProvider>
  );
}
