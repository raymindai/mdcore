import { memo } from "react";
import {
  Cloud, Share2, Eye, Pencil, Users, File as FileIcon, CircleCheck,
} from "lucide-react";

function DocStatusIcon({ tab, isActive }: { tab: { isDraft?: boolean; isRestricted?: boolean; isSharedByMe?: boolean; source?: string; cloudId?: string; permission?: string }; isActive: boolean }) {
  let Icon: typeof Cloud;
  let color: string;
  let tip: string;

  if (tab.permission === "readonly") {
    Icon = Eye; color = isActive ? "var(--accent)" : "var(--text-faint)"; tip = "View only";
  } else if (tab.permission === "editable") {
    Icon = Pencil; color = isActive ? "var(--accent)" : "var(--text-faint)"; tip = "Editable";
  } else if (tab.isDraft === false && tab.isRestricted) {
    Icon = Users; color = isActive ? "var(--accent)" : "#60a5fa"; tip = "Shared with specific people";
  } else if (tab.isDraft === false && tab.isSharedByMe) {
    Icon = Share2; color = isActive ? "var(--accent)" : "#4ade80"; tip = "Shared publicly";
  } else if (tab.source && ["vscode", "desktop", "cli", "mcp"].includes(tab.source)) {
    Icon = CircleCheck; color = isActive ? "var(--accent)" : "#22c55e"; tip = `Synced (${tab.source})`;
  } else {
    Icon = FileIcon; color = isActive ? "var(--accent)" : "var(--text-faint)"; tip = "Private";
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
