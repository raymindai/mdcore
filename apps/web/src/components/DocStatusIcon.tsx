import { memo } from "react";
import {
  Share2, Eye, Users, File as FileIcon, CircleCheck, Cloud,
} from "lucide-react";

/**
 * Document status icon — single source of truth from tab properties.
 * Synced + shared shows sync icon with a small colored dot indicator.
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

  // Determine primary icon and secondary indicator
  let Icon: typeof Cloud;
  let color: string;
  let tip: string;
  let dotColor: string | null = null;

  if (tab.permission === "readonly") {
    Icon = Eye; color = "var(--text-faint)"; tip = "View only";
  } else if (isSharedPublic) {
    Icon = Share2; color = "#4ade80"; tip = "Shared (anyone with link)";
    if (isSynced) { dotColor = "#22c55e"; tip += ` · Synced (${tab.source})`; }
  } else if (isPublished && hasSharedPeople) {
    Icon = Users; color = "#60a5fa"; tip = "Shared with specific people";
    if (isSynced) { dotColor = "#22c55e"; tip += ` · Synced (${tab.source})`; }
  } else if (isSynced) {
    Icon = CircleCheck; color = "#22c55e"; tip = `Synced (${tab.source})`;
  } else {
    Icon = FileIcon; color = "var(--text-faint)"; tip = isPublished ? "Published" : "Private";
  }

  return (
    <div className="relative shrink-0 flex items-center group/icon">
      <Icon width={14} height={14} style={{ color }} />
      {dotColor && (
        <svg className="absolute -bottom-[3px] -right-[3px]" width="8" height="8" viewBox="0 0 8 8" style={{ filter: "drop-shadow(0 0 1px var(--background))" }}>
          <circle cx="4" cy="4" r="3.5" fill="var(--background)" />
          <path d="M2.5 4.2L3.5 5.2L5.5 3" stroke={dotColor} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
