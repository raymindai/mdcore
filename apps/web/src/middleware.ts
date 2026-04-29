import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that have Korean versions
const I18N_PAGES = ["/about", "/manifesto", "/docs", "/plugins"];

// Common bot/crawler user agents
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|linkedinbot|twitterbot|whatsapp|telegram|discord|slack|claude|chatgpt|gpt|anthropic|openai|google-extended|bingbot|yandex|baidu|duckduck|archive\.org|wget|curl|httpie|python-requests|axios|node-fetch|undici/i;

function isBot(ua: string): boolean {
  return BOT_UA.test(ua);
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const ua = request.headers.get("user-agent") || "";

  // Bot/AI accessing documents → serve raw markdown
  if (isBot(ua)) {
    // /?doc=ID → rewrite to /raw/ID
    if (pathname === "/" && searchParams.has("doc")) {
      const docId = searchParams.get("doc");
      if (docId) {
        const url = request.nextUrl.clone();
        url.pathname = `/raw/${docId}`;
        url.search = "";
        return NextResponse.rewrite(url);
      }
    }
    // /d/ID → rewrite to /raw/ID
    const docMatch = pathname.match(/^\/d\/([A-Za-z0-9_-]+)$/);
    if (docMatch) {
      const url = request.nextUrl.clone();
      url.pathname = `/raw/${docMatch[1]}`;
      url.search = "";
      return NextResponse.rewrite(url);
    }
  }

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
