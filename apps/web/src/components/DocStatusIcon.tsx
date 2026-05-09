import { memo } from "react";
import {
  Eye, Globe, Cloud, Pencil, Users, FileIcon,
} from "lucide-react";
import Tooltip from "@/components/Tooltip";

// Doc icon — communicates ACCESS state. Five distinct states so the
// founder's library doesn't read as a wall of identical icons:
//
//   Eye       (faint)  View only — shared WITH you (not yours)
//   Pencil    (faint)  Draft — work-in-progress, not yet published
//   Cloud     (faint)  Saved cloud — published but only you can read
//                       (default for logged-in user, edit_mode account/token)
//   Users     (blue)   Shared — password OR specific people
//   Globe     (accent) Public — anyone with the link can read
//                       (edit_mode view/public)
//
// "Published" and "Public" are NOT the same: a doc you publish without
// granting view/public access is just persisted to cloud — only you
// can read it via /d/<id>. The Cloud icon captures that nuance.
//
// The synced-from-external badge (green checkmark) overlays whichever
// tier the doc is in.

function DocStatusIcon({ tab, isActive }: {
  tab: {
    isDraft?: boolean;
    editMode?: string;
    sharedWithCount?: number;
    source?: string;
    cloudId?: string;
    permission?: string;
    isRestricted?: boolean;
    isSharedByMe?: boolean;
    hasPassword?: boolean;
  };
  isActive: boolean;
}) {
  void isActive;

  const isPublished = tab.isDraft === false;
  const isPublicLink = tab.editMode === "view" || tab.editMode === "public";
  const hasEmailRestriction = (tab.sharedWithCount ?? 0) > 0 || tab.isRestricted === true;
  const hasPassword = tab.hasPassword === true;
  const isSynced = tab.source && ["vscode", "desktop", "cli", "mcp"].includes(tab.source);

  let Icon: typeof Globe;
  let color: string;
  let tip: string;

  if (tab.permission === "readonly") {
    Icon = Eye;
    color = "var(--text-faint)";
    tip = "View only — shared with you";
  } else if (isPublished && (hasPassword || hasEmailRestriction)) {
    Icon = Users;
    color = "#60a5fa";
    tip = hasPassword && hasEmailRestriction
      ? "Shared — password + specific people"
      : hasPassword
        ? "Shared — password protected"
        : "Shared — with specific people";
  } else if (isPublished && isPublicLink) {
    Icon = Globe;
    color = "var(--accent)";
    tip = "Public — anyone with the link can read";
  } else if (isPublished) {
    // Saved to cloud, but no public link and no shares set —
    // ShareModal calls this "Restricted". Only the owner can read it
    // via /d/<id>. Default state for a logged-in user's published
    // docs.
    Icon = Cloud;
    color = "var(--text-faint)";
    tip = "Saved — only you can read this. Open Share to publish.";
  } else if (tab.cloudId) {
    // Auto-saved draft, never published.
    Icon = Pencil;
    color = "var(--text-faint)";
    tip = "Draft — work in progress, not yet published";
  } else {
    Icon = FileIcon;
    color = "var(--text-faint)";
    tip = "Local — not saved to cloud yet";
  }

  if (isSynced) tip += ` · synced from ${tab.source}`;

  return (
    <Tooltip text={tip}>
      <div className="relative shrink-0 flex items-center" style={{ width: 18, height: 16 }}>
        <Icon width={14} height={14} style={{ color }} />
        {isSynced && (
          <svg className="absolute -bottom-[3px] -right-[3px]" width="11" height="11" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="5.5" fill="var(--background)" />
            <circle cx="6" cy="6" r="4.5" fill="var(--accent)" />
            <path d="M4 6.2L5.3 7.5L8 4.5" stroke="var(--background)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        )}
      </div>
    </Tooltip>
  );
}

export default memo(DocStatusIcon);
