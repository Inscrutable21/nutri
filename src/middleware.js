import { authMiddleware } from "@clerk/nextjs";
 
export default authMiddleware({
  publicRoutes: [
    "/",
    "/api/webhooks/clerk",
    // Add other public routes as needed
  ],
  ignoredRoutes: [
    "/api/webhooks/clerk"
  ]
});
 
export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)"
  ]
};