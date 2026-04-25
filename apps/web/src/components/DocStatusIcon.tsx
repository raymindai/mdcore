import { memo } from "react";
import {
  Share2, Eye, Users, File as FileIcon, Cloud,
} from "lucide-react";

/**
 * Document status icon with optional sync indicator.
 * Synced docs: base icon + ∞ symbol at bottom-right in key color.
 */
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
  };
  isActive: boolean;
}) {
  const isPublished = tab.isDraft === false;
  const isPublicLink = tab.editMode === "view" || tab.editMode === "public";
  const hasSharedPeople = (tab.sharedWithCount ?? 0) > 0 || tab.isRestricted === true;
  const isSharedPublic = isPublished && (isPublicLink || tab.isSharedByMe === true);
  const isSynced = tab.source && ["vscode", "desktop", "cli", "mcp"].includes(tab.source);

  let Icon: typeof Cloud;
  let color: string;
  let tip: string;

  if (tab.permission === "readonly") {
    Icon = Eye; color = "var(--text-faint)"; tip = "View only";
  } else if (isSharedPublic) {
    Icon = Share2; color = "#4ade80"; tip = "Shared (anyone with link)";
  } else if (isPublished && hasSharedPeople) {
    Icon = Users; color = "#60a5fa"; tip = "Shared with specific people";
  } else {
    Icon = FileIcon; color = "var(--text-faint)"; tip = isPublished ? "Published" : "Private";
  }

  if (isSynced) {
    tip += tip ? ` · Synced (${tab.source})` : `Synced (${tab.source})`;
  }

  return (
    <div className="relative shrink-0 flex items-center group/icon" style={{ width: 18, height: 16 }}>
      <Icon width={14} height={14} style={{ color }} />
      {isSynced && (
        <svg className="absolute -bottom-[1px] -right-[1px]" width="10" height="10" viewBox="0 0 12 12" style={{ filter: "drop-shadow(0 0 1px var(--background))" }}>
          <circle cx="6" cy="6" r="5.5" fill="var(--background)" />
          <path d="M3 6C3 4.5 4 3.5 5.5 3.5C6.5 3.5 7.2 4 7.5 4.5M9 6C9 7.5 8 8.5 6.5 8.5C5.5 8.5 4.8 8 4.5 7.5" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M7 3.5L8 4.5L7.5 5" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M5 8.5L4 7.5L4.5 7" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
      <div className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[9px] whitespace-nowrap opacity-0 pointer-events-none group-hover/icon:opacity-100 transition-opacity z-[9998]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
        {tip}
      </div>
    </div>
  );
}

export default memo(DocStatusIcon);
