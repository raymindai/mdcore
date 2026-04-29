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

// Detect non-browser requests (bots, AI tools, scrapers, CLI tools)
const KNOWN_BOTS = /bot|crawl|spider|slurp|facebook|linkedin|twitter|whatsapp|telegram|discord|slack|claude|chatgpt|gpt|anthropic|openai|google-extended|bing|yandex|baidu|duckduck|archive\.org|wget|curl|httpie|python|axios|node-fetch|undici|fetch|http|scraper/i;

function isBot(ua: string, accept?: string | null): boolean {
  if (!ua) return true;
  if (KNOWN_BOTS.test(ua)) return true;
  // Real browsers send detailed Accept headers; API clients/fetchers send */* or nothing
  if (accept && !accept.includes("text/html")) return true;
  if (!accept || accept === "*/*") return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const ua = request.headers.get("user-agent") || "";
  const accept = request.headers.get("accept");

  // Bot/AI accessing documents → fetch raw markdown
  if (isBot(ua, accept)) {
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
        // Fetch directly from Supabase (not self-referencing API to avoid edge deadlock)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/documents?id=eq.${docId}&select=id,markdown,title,is_draft,password_hash,deleted_at`,
            { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
          );
          if (res.ok) {
            const rows = await res.json();
            const doc = rows?.[0];
            if (doc?.markdown && !doc.is_draft && !doc.password_hash && !doc.deleted_at) {
              const title = doc.title || "Untitled";
              const body = `# ${title}\n\n${doc.markdown}`;
              return new NextResponse(body, {
                status: 200,
                headers: {
                  "Content-Type": "text/markdown; charset=utf-8",
                  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
                  "X-Document-ID": docId,
                  "X-Powered-By": "mdcore-engine/0.1.0",
                },
              });
            }
          }
        }
      } catch { /* fallthrough to normal rendering */ }
    }
  }

  // Short URL: /zggFXgUL → rewrite to /d/zggFXgUL (bots already handled above)
  const shortIdMatch = pathname.match(/^\/([A-Za-z0-9_-]{6,12})$/);
  if (shortIdMatch && !STATIC_ROUTES.has(pathname) && !pathname.startsWith("/ko/") && !pathname.startsWith("/docs/") && !pathname.startsWith("/d/") && !pathname.startsWith("/embed/") && !pathname.startsWith("/raw/") && !pathname.startsWith("/auth/")) {
    const docId = shortIdMatch[1];
    // Bot: serve raw markdown via Supabase direct
    if (isBot(ua, accept)) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/documents?id=eq.${docId}&select=id,markdown,title,is_draft,password_hash,deleted_at`,
            { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
          );
          if (res.ok) {
            const rows = await res.json();
            const doc = rows?.[0];
            if (doc?.markdown && !doc.is_draft && !doc.password_hash && !doc.deleted_at) {
              const title = doc.title || "Untitled";
              const body = `# ${title}\n\n${doc.markdown}`;
              return new NextResponse(body, {
                status: 200,
                headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=60", "X-Powered-By": "mdcore-engine/0.1.0" },
              });
            }
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
  response.headers.set("X-Is-Bot", String(isBot(ua, accept)));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|images|icons).*)"],
};
