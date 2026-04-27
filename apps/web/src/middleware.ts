import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that have Korean versions
const I18N_PAGES = ["/about", "/manifesto", "/docs", "/plugins"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auto-redirect to Korean for i18n pages (only if not already on /ko/)
  if (I18N_PAGES.includes(pathname)) {
    const lang = request.headers.get("accept-language") || "";
    const prefersKo = lang.split(",").some((l) => l.trim().startsWith("ko"));
    // Check if user explicitly chose English (cookie)
    const langCookie = request.cookies.get("mdfy-lang")?.value;

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
