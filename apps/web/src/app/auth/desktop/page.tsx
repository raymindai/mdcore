// /auth/desktop — kept as a backwards-compat redirect to /auth/cli.
//
// The Electron desktop app (legacy, baked against mdfy.cc) used to
// land here and auto-handle a `mdfy://auth?token=...` deep-link. The
// app is being deprecated in favour of the PWA + macOS Share Sheet
// + QuickLook plan (see the strategy notes for context), so this
// route no longer launches anything by itself.
//
// Anyone still hitting /auth/desktop (old CLI versions, bookmarks,
// outdated docs) ends up at /auth/cli — the same copy-token flow
// the current `mdfy login` opens.

import { redirect } from "next/navigation";

export default function DesktopAuthPage() {
  redirect("/auth/cli");
}
