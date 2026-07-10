/**
 * Convex ↔ Clerk auth. Set CLERK_JWT_ISSUER_DOMAIN in the Convex deployment
 * (Convex dashboard → Settings → Environment Variables, or `npx convex env set`).
 * It is your Clerk Frontend API URL, e.g. https://your-app.clerk.accounts.dev
 */
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
