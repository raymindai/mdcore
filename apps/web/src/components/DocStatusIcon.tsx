import { memo } from "react";
import {
  Cloud, Share2, Eye, Users, File as FileIcon, CircleCheck,
} from "lucide-react";

/**
 * Document status icon — single source of truth from tab properties.
 *
 * Icon logic (priority order):
 * 1. View only: tab.permission === "readonly" → Eye
 * 2. Synced: tab.source is vscode/desktop/cli/mcp → CircleCheck
 * 3. Published + edit_mode=view/public: anyone can view → Share2
 * 4. Published + has shared people: shared with specific people → Users
 * 5. Default: private/draft → FileIcon
 */
function DocStatusIcon({ tab, isActive }: {
  tab: {
    isDraft?: boolean;
    editMode?: string;       // "owner" | "token" | "view" | "public"
    sharedWithCount?: number; // number of non-owner people shared with
    source?: string;
    cloudId?: string;
    permission?: string;
    // Legacy fields (still supported for backward compat)
    isRestricted?: boolean;
    isSharedByMe?: boolean;
  };
  isActive: boolean;
}) {
  let Icon: typeof Cloud;
  let color: string;
  let tip: string;

  const isPublished = tab.isDraft === false;
  const isPublicLink = tab.editMode === "view" || tab.editMode === "public";
  const hasSharedPeople = (tab.sharedWithCount ?? 0) > 0 || tab.isRestricted === true;
  const isSharedPublic = isPublished && (isPublicLink || tab.isSharedByMe === true);

  if (tab.permission === "readonly") {
    Icon = Eye; color = isActive ? "var(--accent)" : "var(--text-faint)"; tip = "View only";
  } else if (tab.source && ["vscode", "desktop", "cli", "mcp"].includes(tab.source)) {
    Icon = CircleCheck; color = isActive ? "var(--accent)" : "#22c55e"; tip = `Synced (${tab.source})`;
  } else if (isSharedPublic) {
    Icon = Share2; color = isActive ? "var(--accent)" : "#4ade80"; tip = "Shared (anyone with link)";
  } else if (isPublished && hasSharedPeople) {
    Icon = Users; color = isActive ? "var(--accent)" : "#60a5fa"; tip = "Shared with specific people";
  } else {
    Icon = FileIcon; color = isActive ? "var(--accent)" : "var(--text-faint)"; tip = tab.isDraft === false ? "Published" : "Private";
  }

  return (
    <div className="relative shrink-0 flex items-center group/icon">
      <Icon width={14} height={14} style={{ color }} />
      <div className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[9px] whitespace-nowrap opacity-0 pointer-events-none group-hover/icon:opacity-100 transition-opacity z-[9998]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
        {tip}
      </div>
    </div>
  );
}

export default memo(DocStatusIcon);
