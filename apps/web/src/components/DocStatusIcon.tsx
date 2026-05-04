import { memo } from "react";
import {
  Share2, Eye, Users, File as FileIcon, Cloud,
} from "lucide-react";
import Tooltip from "@/components/Tooltip";

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
  } else if (tab.cloudId) {
    Icon = Cloud; color = "var(--text-faint)"; tip = isPublished ? "Cloud (published)" : "Cloud";
  } else {
    Icon = FileIcon; color = "var(--text-faint)"; tip = "Local";
  }

  if (isSynced) tip += ` · Synced (${tab.source})`;

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
