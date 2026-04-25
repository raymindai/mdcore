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
    Icon = Eye; color = isActive ? "var(--accent)" : "var(--text-faint)"; tip = "View only";
  } else if (isSharedPublic) {
    Icon = Share2; color = isActive ? "var(--accent)" : "#4ade80"; tip = "Shared (anyone with link)";
    if (isSynced) { dotColor = "#22c55e"; tip += ` · Synced (${tab.source})`; }
  } else if (isPublished && hasSharedPeople) {
    Icon = Users; color = isActive ? "var(--accent)" : "#60a5fa"; tip = "Shared with specific people";
    if (isSynced) { dotColor = "#22c55e"; tip += ` · Synced (${tab.source})`; }
  } else if (isSynced) {
    Icon = CircleCheck; color = isActive ? "var(--accent)" : "#22c55e"; tip = `Synced (${tab.source})`;
  } else {
    Icon = FileIcon; color = isActive ? "var(--accent)" : "var(--text-faint)"; tip = isPublished ? "Published" : "Private";
  }

  return (
    <div className="relative shrink-0 flex items-center group/icon">
      <Icon width={14} height={14} style={{ color }} />
      {dotColor && (
        <span className="absolute -bottom-0.5 -right-0.5 w-[5px] h-[5px] rounded-full" style={{ background: dotColor, border: "1px solid var(--background)" }} />
      )}
      <div className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[9px] whitespace-nowrap opacity-0 pointer-events-none group-hover/icon:opacity-100 transition-opacity z-[9998]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
        {tip}
      </div>
    </div>
  );
}

export default memo(DocStatusIcon);
