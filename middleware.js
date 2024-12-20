import { authMiddleware } from "@clerk/nextjs";
 
// Export middleware
export default authMiddleware({
  publicRoutes: [
    "/",
    "/sign-in",
    "/sign-up",
    "/api/webhooks/clerk",
    "/api/webhooks/(.*)",
    "/api/trpc/(.*)"
  ],
  ignoredRoutes: [
    "/api/webhooks/(.*)"
  ],
});
 
export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)"
  ],
};