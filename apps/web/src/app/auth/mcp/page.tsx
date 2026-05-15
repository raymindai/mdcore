// /auth/mcp — alias for /auth/cli.
//
// MCP servers (Claude Code, Cursor, Claude Desktop) read the same
// `~/.mdfy/config.json` file the `mdfy` CLI writes. The underlying
// auth flow is identical to the CLI's, so we just re-render the
// same component under a URL whose name matches what the user is
// actually setting up. Keeping the routes separate (vs. a redirect)
// lets us evolve MCP-specific copy / docs later without touching
// the CLI path.

export { default } from "../cli/page";
