import { memo } from "react";
import {
  Share2, Eye, Users, File as FileIcon, CircleCheck, Cloud,
} from "lucide-react";

/**
 * Document status icon — single source of truth from tab properties.
 * Shows dual icons when a document is both synced AND shared.
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

  if (tab.permission === "readonly") {
    return <IconWithTooltip icon={Eye} color={isActive ? "var(--accent)" : "var(--text-faint)"} tip="View only" />;
  }

  // Determine share icon
  let ShareIcon: typeof Share2 | null = null;
  let shareColor = "";
  let shareTip = "";
  if (isSharedPublic) {
    ShareIcon = Share2; shareColor = "#4ade80"; shareTip = "Shared (anyone with link)";
  } else if (isPublished && hasSharedPeople) {
    ShareIcon = Users; shareColor = "#60a5fa"; shareTip = "Shared with specific people";
  }

  // Both synced AND shared → dual icons
  if (isSynced && ShareIcon) {
    const syncColor = isActive ? "var(--accent)" : "#22c55e";
    const sColor = isActive ? "var(--accent)" : shareColor;
    return (
      <div className="relative shrink-0 flex items-center group/icon" style={{ width: 22 }}>
        <CircleCheck width={12} height={12} style={{ color: syncColor }} />
        <ShareIcon width={10} height={10} style={{ color: sColor, marginLeft: -2 }} />
        <div className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[9px] whitespace-nowrap opacity-0 pointer-events-none group-hover/icon:opacity-100 transition-opacity z-[9998]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
          Synced ({tab.source}) + {shareTip}
        </div>
      </div>
    );
  }

  // Synced only
  if (isSynced) {
    return <IconWithTooltip icon={CircleCheck} color={isActive ? "var(--accent)" : "#22c55e"} tip={`Synced (${tab.source})`} />;
  }

  // Shared only
  if (ShareIcon) {
    return <IconWithTooltip icon={ShareIcon} color={isActive ? "var(--accent)" : shareColor} tip={shareTip} />;
  }

  // Default: private/draft
  return <IconWithTooltip icon={FileIcon} color={isActive ? "var(--accent)" : "var(--text-faint)"} tip={isPublished ? "Published" : "Private"} />;
}

function IconWithTooltip({ icon: Icon, color, tip }: { icon: typeof Cloud; color: string; tip: string }) {
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
