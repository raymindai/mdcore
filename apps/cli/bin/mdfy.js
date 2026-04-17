#!/usr/bin/env node

/* =========================================================
   mdfy CLI — Publish Markdown from anywhere

   Usage:
     mdfy publish <file>          Publish a .md file → get URL
     mdfy publish                 Publish from stdin
     mdfy update <id> <file>      Update an existing document
     mdfy pull <id>               Download a document
     mdfy pull <id> -o <file>     Download and save to file
     mdfy delete <id>             Delete a document
     mdfy list                    List your documents
     mdfy open <id>               Open document in browser
     mdfy render <file>           Render markdown to HTML
     mdfy login                   Authenticate with mdfy.cc
     mdfy logout                  Clear stored credentials
     mdfy whoami                  Show current user

   Pipe support:
     echo "# Hello" | mdfy publish
     cat README.md | mdfy publish
     tmux capture-pane -p | mdfy publish
     pbpaste | mdfy publish
   ========================================================= */

const fs = require("fs");
const path = require("path");
const os = require("os");

const BASE_URL = process.env.MDFY_URL || "https://mdfy.cc";
const CONFIG_DIR = path.join(os.homedir(), ".mdfy");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const TOKENS_FILE = path.join(CONFIG_DIR, "tokens.json");

// ─── Config ───

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); }
  catch { return {}; }
}

function saveConfig(data) {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

function loadTokens() {
  try { return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8")); }
  catch { return {}; }
}

function saveTokens(data) {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2));
}

// ─── API ───

async function api(method, path, body) {
  const config = loadConfig();
  const headers = { "Content-Type": "application/json" };
  if (config.token) headers["Authorization"] = `Bearer ${config.token}`;
  if (config.userId) headers["x-user-id"] = config.userId;
  if (config.email) headers["x-user-email"] = config.email;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch { err = { error: `HTTP ${res.status}` }; }
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  if (res.headers.get("content-type")?.includes("json")) {
    return res.json();
  }
  return null;
}

// ─── Read stdin ───

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve(null); return; }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => { resolve(data); });
  });
}

// ─── Commands ───

async function cmdPublish(args) {
  let markdown;
  const file = args[0];

  if (file && file !== "-") {
    if (!fs.existsSync(file)) { console.error(`Error: File not found: ${file}`); process.exit(1); }
    markdown = fs.readFileSync(file, "utf8");
  } else {
    markdown = await readStdin();
    if (!markdown) {
      console.error("Usage: mdfy publish <file>");
      console.error("       echo '# Hello' | mdfy publish");
      process.exit(1);
    }
  }

  const title = extractTitle(markdown) || (file ? path.basename(file, ".md") : "Untitled");

  try {
    const result = await api("POST", "/api/docs", {
      markdown,
      title,
      isDraft: false,
      source: "cli",
    });

    const url = `${BASE_URL}/d/${result.id}`;
    console.log(url);

    // Save token for future updates
    const tokens = loadTokens();
    tokens[result.id] = result.editToken;
    saveTokens(tokens);

    // Copy to clipboard (macOS)
    if (process.platform === "darwin") {
      try {
        require("child_process").execSync(`echo -n "${url}" | pbcopy`);
        console.error("  URL copied to clipboard");
      } catch {}
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function cmdUpdate(args) {
  const id = args[0];
  const file = args[1];
  if (!id) { console.error("Usage: mdfy update <id> <file>"); process.exit(1); }

  let markdown;
  if (file) {
    markdown = fs.readFileSync(file, "utf8");
  } else {
    markdown = await readStdin();
    if (!markdown) { console.error("Usage: mdfy update <id> <file>"); process.exit(1); }
  }

  const tokens = loadTokens();
  const editToken = tokens[id];
  if (!editToken) { console.error(`Error: No edit token for ${id}. Publish first.`); process.exit(1); }

  try {
    await api("PATCH", `/api/docs/${id}`, {
      markdown,
      editToken,
      title: extractTitle(markdown),
    });
    console.log(`Updated: ${BASE_URL}/d/${id}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function cmdPull(args) {
  const id = args[0];
  if (!id) { console.error("Usage: mdfy pull <id> [-o file]"); process.exit(1); }

  try {
    const doc = await api("GET", `/api/docs/${id}`);
    const markdown = doc.markdown || doc.content || "";

    const outIdx = args.indexOf("-o");
    if (outIdx !== -1 && args[outIdx + 1]) {
      fs.writeFileSync(args[outIdx + 1], markdown);
      console.error(`Saved to ${args[outIdx + 1]}`);
    } else {
      process.stdout.write(markdown);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function cmdDelete(args) {
  const id = args[0];
  if (!id) { console.error("Usage: mdfy delete <id>"); process.exit(1); }

  const tokens = loadTokens();
  const editToken = tokens[id];

  try {
    await api("PATCH", `/api/docs/${id}`, {
      action: "soft-delete",
      editToken,
    });
    console.log(`Deleted: ${id}`);
    if (tokens[id]) { delete tokens[id]; saveTokens(tokens); }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function cmdList() {
  const config = loadConfig();
  if (!config.userId) { console.error("Not logged in. Run: mdfy login"); process.exit(1); }

  try {
    const data = await api("GET", "/api/user/documents");
    const docs = data.documents || [];
    if (docs.length === 0) { console.log("No documents."); return; }

    const maxTitle = Math.max(...docs.map(d => (d.title || "Untitled").length), 5);
    docs.forEach((d) => {
      const title = (d.title || "Untitled").padEnd(Math.min(maxTitle, 40));
      const date = new Date(d.updated_at).toLocaleDateString();
      const draft = d.is_draft ? " [draft]" : "";
      console.log(`  ${d.id}  ${title}  ${date}${draft}`);
    });
    console.log(`\n${docs.length} document(s)`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function cmdOpen(args) {
  const id = args[0];
  if (!id) { console.error("Usage: mdfy open <id>"); process.exit(1); }
  const url = `${BASE_URL}/d/${id}`;
  if (process.platform === "darwin") {
    require("child_process").exec(`open "${url}"`);
  } else if (process.platform === "linux") {
    require("child_process").exec(`xdg-open "${url}"`);
  } else {
    require("child_process").exec(`start "${url}"`);
  }
  console.log(url);
}

async function cmdLogin() {
  console.log("Opening mdfy.cc in your browser...");
  console.log("After signing in, copy your API token from the settings page.");
  console.log("");

  if (process.platform === "darwin") {
    require("child_process").exec(`open "${BASE_URL}/auth/desktop"`);
  }

  // Simple token input
  const readline = require("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });

  rl.question("Paste your token: ", (token) => {
    rl.close();
    if (!token || !token.trim()) { console.error("No token provided."); process.exit(1); }

    // Decode JWT to get user info
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
      const userId = payload.sub || payload.userId || payload.user_id;
      const email = payload.email;
      saveConfig({ token: token.trim(), userId, email });
      console.log(`Logged in as ${email || userId}`);
    } catch {
      saveConfig({ token: token.trim() });
      console.log("Token saved.");
    }
  });
}

function cmdLogout() {
  if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);
  console.log("Logged out.");
}

function cmdWhoami() {
  const config = loadConfig();
  if (config.email) {
    console.log(config.email);
  } else if (config.userId) {
    console.log(config.userId);
  } else {
    console.log("Not logged in. Run: mdfy login");
  }
}

function cmdHelp() {
  console.log(`mdfy — Publish Markdown from anywhere

Usage:
  mdfy publish <file>          Publish a .md file and get a URL
  mdfy publish                 Publish from stdin (pipe support)
  mdfy update <id> <file>      Update an existing document
  mdfy pull <id>               Download a document to stdout
  mdfy pull <id> -o <file>     Download and save to file
  mdfy delete <id>             Delete a document
  mdfy list                    List your documents
  mdfy open <id>               Open document in browser
  mdfy login                   Authenticate with mdfy.cc
  mdfy logout                  Clear stored credentials
  mdfy whoami                  Show current user

Examples:
  echo "# Hello World" | mdfy publish
  cat README.md | mdfy publish
  tmux capture-pane -p | mdfy publish
  pbpaste | mdfy publish
  mdfy publish ./notes/meeting.md
  mdfy pull abc123 -o meeting.md

Environment:
  MDFY_URL    Base URL (default: https://mdfy.cc)

Config:  ~/.mdfy/config.json
Tokens:  ~/.mdfy/tokens.json
`);
}

// ─── Helpers ───

function extractTitle(md) {
  const match = (md || "").match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

// ─── Main ───

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case "publish": case "pub": case "p":
      await cmdPublish(args.slice(1));
      break;
    case "update": case "up":
      await cmdUpdate(args.slice(1));
      break;
    case "pull": case "get":
      await cmdPull(args.slice(1));
      break;
    case "delete": case "del": case "rm":
      await cmdDelete(args.slice(1));
      break;
    case "list": case "ls":
      await cmdList();
      break;
    case "open":
      await cmdOpen(args.slice(1));
      break;
    case "login":
      await cmdLogin();
      break;
    case "logout":
      cmdLogout();
      break;
    case "whoami":
      cmdWhoami();
      break;
    case "help": case "--help": case "-h":
      cmdHelp();
      break;
    case "version": case "--version": case "-v":
      console.log(require("../package.json").version);
      break;
    default:
      if (!cmd) {
        // No command — check stdin
        const stdin = await readStdin();
        if (stdin) {
          // Pipe mode: publish stdin
          process.argv.push("publish");
          await cmdPublish([]);
        } else {
          cmdHelp();
        }
      } else {
        console.error(`Unknown command: ${cmd}`);
        console.error("Run 'mdfy help' for usage.");
        process.exit(1);
      }
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
