import { memo } from "react";
import {
  Eye, Globe, Lock, Users, FileIcon,
} from "lucide-react";
import Tooltip from "@/components/Tooltip";

// Doc icon — communicates ACCESS state (who can READ this doc).
// There are exactly THREE access states a doc can be in (matching
// ShareModal's "Who can read" radio + the Hub's owner view):
//
//   Lock    (faint)  Private   — only you (is_draft=true)
//   Users   (blue)   Shared    — password OR specific people
//   Globe   (accent) Public    — anyone with the URL (is_draft=false,
//                                no password, no email allow-list)
//
// Plus two contextual states:
//   Eye      (faint) View only — someone else shared it WITH you
//   FileIcon (faint) Local     — never synced to cloud
//
// "Draft" is intentionally NOT a category. A doc you've saved but
// not shared is just Private (saved to cloud, only you can read).
// Publishing isn't the goal — the goal is choosing who can read.

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
    // is_draft=true — saved to cloud but not shared. Only you can read.
    Icon = Lock;
    color = "var(--text-faint)";
    tip = "Private — saved to cloud, only you can read";
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
