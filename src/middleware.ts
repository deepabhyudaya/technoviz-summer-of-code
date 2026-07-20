import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Role-specific route prefixes
const roleRoutes: Record<string, string[]> = {
  admin: ["/admin"],
  student: ["/student"],
  teacher: ["/teacher"],
  parent: ["/parent"],
};

// Routes accessible to all authenticated users
const publicAuthRoutes = [
  "/community",
  "/settings/community",
  "/list",
  "/api",
  "/profile",
  "/messages",
  "/notifications",
  "/tickets",
];

export default clerkMiddleware(async (auth, req) => {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role?.toLowerCase();
  const url = req.nextUrl;
  const pathname = url.pathname;
  const hostname = req.headers.get("host") || "";

  let currentHost = hostname.replace(`:${url.port}`, "");
  const isLocalhost = currentHost.endsWith("localhost");
  
  let subdomain = null;
  if (isLocalhost && currentHost !== "localhost") {
    subdomain = currentHost.replace(".localhost", "");
  }

  if (subdomain && subdomain !== "www") {
    return NextResponse.rewrite(new URL(`/teacher-courses/${subdomain}${pathname}`, req.url));
  }

  // Redirect root to role-based dashboard
  if (role && pathname === "/") {
    return NextResponse.redirect(new URL(`/${role}`, req.url));
  }

  // Allow rivalry detail pages for all authenticated users regardless of role
  if (role && pathname.startsWith("/student/rivalry/")) {
    return NextResponse.next();
  }

  // Check if this is a role-specific route
  for (const [userRole, prefixes] of Object.entries(roleRoutes)) {
    for (const prefix of prefixes) {
      if (pathname.startsWith(prefix)) {
        // If no role, redirect to home
        if (!role) {
          return NextResponse.redirect(new URL("/", req.url));
        }
        // If wrong role, redirect to their dashboard
        if (role !== userRole) {
          return NextResponse.redirect(new URL(`/${role}`, req.url));
        }
        return NextResponse.next();
      }
    }
  }

  // Allow all authenticated users to access community and public auth routes
  for (const prefix of publicAuthRoutes) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next();
    }
  }

  // Handle username-based profile routes (e.g., /de3p, /de3p/followers)
  // These are single-segment or two-segment paths that don't match other patterns
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1 || segments.length === 2) {
    // Check if it's not a system route (no dots, not a file extension)
    const firstSegment = segments[0];
    const isSystemRoute = 
      firstSegment.includes(".") ||
      ["_next", "api", "favicon.ico", "robots.txt", "sitemap.xml"].includes(firstSegment);
    
    if (!isSystemRoute) {
      // This is likely a username-based profile route
      // Allow if authenticated, redirect to home if not
      if (!role) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }
  }

  // Default: allow the request
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and well-known verification files
    "/((?!_next|.well-known|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
