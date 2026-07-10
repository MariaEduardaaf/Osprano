import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Next.js 16 renamed `middleware` → `proxy` (nodejs runtime). Clerk's handler
 * runs here just the same. If a future Clerk release requires the legacy
 * filename, rename this file to `middleware.ts` and the export to `middleware`.
 */
const isProtected = createRouteMatcher([
  "/dashboard(.*)",
  "/leads(.*)",
  "/crm(.*)",
  "/outreach(.*)",
  "/sites(.*)",
  "/plans(.*)",
  "/settings(.*)",
]);

const clerkProxy = clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect();
  }
});

// Demo mode (dev only): pass everything through, no auth.
function demoProxy() {}

export default process.env.NEXT_PUBLIC_DEMO === "1" ? demoProxy : clerkProxy;

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|gif|svg|png|ico|webp|woff2?|ttf|map)).*)",
    "/(api|trpc)(.*)",
  ],
};
