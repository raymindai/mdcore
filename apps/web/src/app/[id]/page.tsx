// Direct filesystem route for /{id} — no middleware rewrite needed
// This eliminates NextResponse.rewrite() which causes 500 for some fetchers
export { default, generateMetadata } from "../d/[id]/page";
