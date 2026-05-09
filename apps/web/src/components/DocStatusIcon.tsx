import { memo } from "react";
import {
  Eye, Globe, Lock, Users,
} from "lucide-react";
import Tooltip from "@/components/Tooltip";

// Doc icon — communicates ACCESS state (Public / Shared / Private),
// matching the access-tier vocabulary the Hub view uses. The same
// classification logic powers /api/hub/[slug]'s ownerView, so a doc
// reads the same way in MDs, in Recent, and in the Hub tab.
//
// Tier breakdown (mirrors hub-route.ts):
//   - Private:  is_draft=true, OR shared-with-me readonly views
//   - Shared:   published AND (password OR allowed_emails OR a public
//               link)
//   - Public:   published AND no password, no email allow-list, no
//               public-link mode
//
// The synced-from-external badge (green checkmark on top of the
// access icon) is preserved and overlays whichever tier the doc is
// in. Externally-synced + private vs externally-synced + shared etc.
// all read at once.

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
  const isPublicLink = tab.editMode === "view" || tab.editMode === "public" || tab.isSharedByMe === true;
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
  } else if (!isPublished) {
    // Drafts and any owner-only doc that hasn't been published yet.
    Icon = Lock;
    color = "var(--text-faint)";
    tip = "Private — only you can read this";
  } else if (hasPassword || hasEmailRestriction) {
    Icon = Users;
    color = "#60a5fa";
    tip = hasPassword && hasEmailRestriction
      ? "Shared — password + specific people"
      : hasPassword
        ? "Shared — password protected"
        : "Shared — with specific people";
  } else if (isPublicLink) {
    Icon = Globe;
    color = "var(--accent)";
    tip = "Public — anyone with the link can read";
  } else {
    // Published but the owner hasn't opted into a public link or
    // email restriction. Treat as PUBLIC — it's listed on the hub
    // and reachable by URL — so the user sees the same Globe they
    // see in the Hub view's Public section.
    Icon = Globe;
    color = "var(--accent)";
    tip = "Public — listed on your hub";
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
