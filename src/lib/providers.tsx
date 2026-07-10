"use client";

import type { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

/**
 * Wires Convex to Clerk auth. In demo mode (dev only) it uses a plain
 * ConvexProvider with no Clerk dependency. If NEXT_PUBLIC_CONVEX_URL isn't set,
 * renders children so the app still boots.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return <>{children}</>;
  if (DEMO) return <ConvexProvider client={convex}>{children}</ConvexProvider>;
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
