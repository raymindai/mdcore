import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that have Korean versions
const I18N_PAGES = ["/about", "/manifesto", "/docs", "/plugins"];

// Known static routes — anything NOT in this list with a short ID pattern is a document
const STATIC_ROUTES = new Set([
  "/", "/about", "/manifesto", "/plugins", "/docs", "/discover",
  "/privacy", "/terms", "/settings", "/auth",
  "/ko", "/ko/about", "/ko/manifesto", "/ko/plugins", "/ko/docs",
  "/embed", "/raw", "/d",
]);

// Common bot/crawler user agents
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|linkedinbot|twitterbot|whatsapp|telegram|discord|slack|claude|chatgpt|gpt|anthropic|openai|google-extended|bingbot|yandex|baidu|duckduck|archive\.org|wget|curl|httpie|python-requests|axios|node-fetch|undici/i;

function isBot(ua: string): boolean {
  return BOT_UA.test(ua);
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const ua = request.headers.get("user-agent") || "";

  // Bot/AI accessing documents → fetch raw markdown from API
  if (isBot(ua)) {
    let docId: string | null = null;
    // /?doc=ID
    if (pathname === "/" && searchParams.has("doc")) {
      docId = searchParams.get("doc");
    }
    // /d/ID
    const docMatch = pathname.match(/^\/d\/([A-Za-z0-9_-]+)$/);
    if (docMatch) docId = docMatch[1];

    if (docId) {
      try {
        const apiUrl = `${request.nextUrl.origin}/api/docs/${docId}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.markdown && !data.is_draft && !data.hasPassword) {
            const title = data.title || "Untitled";
            const body = `# ${title}\n\n${data.markdown}`;
            return new NextResponse(body, {
              status: 200,
              headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
                "X-Document-ID": docId,
              },
            });
          }
        }
      } catch { /* fallthrough to normal rendering */ }
    }
  }

  // Short URL: /zggFXgUL → rewrite to /d/zggFXgUL (bots already handled above)
  const shortIdMatch = pathname.match(/^\/([A-Za-z0-9_-]{6,12})$/);
  if (shortIdMatch && !STATIC_ROUTES.has(pathname) && !pathname.startsWith("/ko/") && !pathname.startsWith("/docs/") && !pathname.startsWith("/d/") && !pathname.startsWith("/embed/") && !pathname.startsWith("/raw/") && !pathname.startsWith("/auth/")) {
    const docId = shortIdMatch[1];
    // Bot: serve raw markdown via API
    if (isBot(ua)) {
      try {
        const apiUrl = `${request.nextUrl.origin}/api/docs/${docId}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.markdown && !data.is_draft && !data.hasPassword) {
            const title = data.title || "Untitled";
            const body = `# ${title}\n\n${data.markdown}`;
            return new NextResponse(body, {
              status: 200,
              headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=60" },
            });
          }
        }
      } catch { /* fallthrough */ }
    }
    // Human: rewrite to /d/ID
    const url = request.nextUrl.clone();
    url.pathname = `/d/${docId}`;
    url.search = "";
    return NextResponse.rewrite(url);
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
  response.headers.set("X-Middleware-Active", "true");
  response.headers.set("X-Is-Bot", String(isBot(ua)));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|images|icons).*)"],
};
