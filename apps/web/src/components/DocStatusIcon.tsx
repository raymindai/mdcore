import { memo } from "react";
import {
  Eye, Globe, Pencil, Users, FileIcon,
} from "lucide-react";
import Tooltip from "@/components/Tooltip";

// Doc icon — communicates ACCESS state (specifically: who can READ
// this doc). Aligned with the actual read-permission gating in
// GET /api/docs/[id]:
//
//   - is_draft=true            → owner only
//   - allowed_emails set       → those emails + owner
//   - password_hash set        → password required
//   - otherwise (the default)  → anyone with the URL can read
//
// edit_mode only gates WRITE permissions, not reads — so a default
// account-mode published doc is fully public for reading even though
// ShareModal currently labels it "Restricted" (that label refers to
// edit-restriction, not read-restriction; separate cleanup later).
//
// Five states:
//   Globe   (accent) Public    — is_draft=false + no pw + no emails.
//                                Same docs that show on /hub/<slug>.
//   Users   (blue)   Shared    — password OR specific people
//   Pencil  (faint)  Draft     — is_draft=true (auto-saved, never
//                                published)
//   Eye     (faint)  View only — shared WITH you
//   FileIcon(faint)  Local     — never synced to cloud

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
  } else if (isPublished) {
    // Default published state — read-public. Anyone with the URL can
    // open it; it's listed on the hub. ShareModal's "Restricted"
    // label here refers to EDIT restrictions, not READ — cleanup of
    // that wording is a separate item.
    Icon = Globe;
    color = "var(--accent)";
    tip = "Public — anyone with the URL can read";
  } else if (tab.cloudId) {
    Icon = Pencil;
    color = "var(--text-faint)";
    tip = "Draft — work in progress, only you can read";
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
