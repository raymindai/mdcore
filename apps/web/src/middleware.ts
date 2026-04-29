import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that have Korean versions
const I18N_PAGES = ["/about", "/manifesto", "/docs", "/plugins"];

// Known static routes — anything NOT in this list with a short ID pattern is a document
const STATIC_ROUTES = new Set([
  "/", "/about", "/manifesto", "/plugins", "/docs", "/discover",
  "/privacy", "/terms", "/settings", "/auth",
  "/ko", "/ko/about", "/ko/manifesto", "/ko/plugins", "/ko/docs",
]);

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // /?doc=ID → redirect to /{id} (backwards compat)
  if (pathname === "/" && searchParams.has("doc")) {
    const docId = searchParams.get("doc");
    if (docId) {
      const url = request.nextUrl.clone();
      url.pathname = `/${docId}`;
      url.search = "";
      return NextResponse.redirect(url, 301);
    }
  }

  // /d/ID → redirect to /{id} (backwards compat)
  const dMatch = pathname.match(/^\/d\/([A-Za-z0-9_-]+)$/);
  if (dMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/${dMatch[1]}`;
    return NextResponse.redirect(url, 301);
  }

  // /{id} short URL → rewrite to /d/{id} (internal Next.js route)
  const shortIdMatch = pathname.match(/^\/([A-Za-z0-9_-]{6,12})$/);
  if (shortIdMatch && !STATIC_ROUTES.has(pathname) && !pathname.startsWith("/ko/") && !pathname.startsWith("/docs/") && !pathname.startsWith("/embed/") && !pathname.startsWith("/raw/") && !pathname.startsWith("/auth/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/d/${shortIdMatch[1]}`;
    return NextResponse.rewrite(url);
  }

  // i18n redirects
  const langCookie = request.cookies.get("mdfy-lang")?.value;

  // If user explicitly chose English and is on /ko/ path, redirect to English
  if (pathname.startsWith("/ko/") && langCookie === "en") {
    const enPath = pathname.replace(/^\/ko/, "");
    const url = request.nextUrl.clone();
    url.pathname = enPath || "/";
    return NextResponse.redirect(url);
  }

  // Auto-redirect to Korean for i18n pages (only if not already on /ko/)
  if (I18N_PAGES.includes(pathname)) {
    const lang = request.headers.get("accept-language") || "";
    const prefersKo = lang.split(",").some((l) => l.trim().startsWith("ko"));

    if (prefersKo && langCookie !== "en") {
      const url = request.nextUrl.clone();
      url.pathname = `/ko${pathname}`;
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|images|icons).*)"],
};
