import { memo } from "react";
import {
  Eye, Globe, Lock, Users,
} from "lucide-react";
import Tooltip from "@/components/Tooltip";

// Doc icon — communicates ACCESS state (Public / Shared / Private),
// matching the same vocabulary the ShareModal and Hub view use.
//
// Definitions (must stay in lockstep with ShareModal +
// /api/hub/[slug] classifyDoc):
//   - Public:  edit_mode is "view" or "public" — anyone with the
//              URL can read. ShareModal's "Anyone with the link".
//   - Shared:  has password OR allowed_emails — restricted to
//              specific people. ShareModal's "Restricted" + people.
//   - Private: anything else. Drafts AND published docs whose
//              edit_mode is "account"/"owner"/"token" with no
//              password and no allowed_emails (only the owner can
//              read). ShareModal's plain "Restricted".
//
// "Published" alone (is_draft=false) is NOT enough to be Public —
// the owner has to explicitly grant view/public access via the
// share modal. Otherwise the doc is restricted to the owner only,
// which is Private.
//
// The synced-from-external badge (green checkmark) overlays
// whichever tier the doc is in.

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
    // Shared takes priority over Public when both apply (specific-
    // people restrictions narrow the audience even if a public-link
    // mode is set).
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
  } else {
    // Drafts AND published-but-restricted docs (edit_mode owner /
    // account / token with no shares). Both are private to the owner
    // — the URL can't be opened by anyone else.
    Icon = Lock;
    color = "var(--text-faint)";
    tip = isPublished
      ? "Private — restricted to you"
      : "Private — draft, only you can read";
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
