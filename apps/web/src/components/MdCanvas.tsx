"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  type CanvasNode,
  type CanvasEdge,
  canvasToMermaid,
  mermaidToCanvas,
  wrapInCodeBlock,
} from "@/lib/canvas-to-mermaid";

let nextId = 1;
function genId() {
  return `n${nextId++}`;
}

type Direction = "LR" | "TD";

interface DragState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

interface ConnectState {
  fromId: string;
  mouseX: number;
  mouseY: number;
}

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const shapeCSS: Record<CanvasNode["shape"], React.CSSProperties> = {
  round: { borderRadius: "20px" },
  square: { borderRadius: "4px" },
  circle: { borderRadius: "50%", width: "90px", height: "90px", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px" },
  diamond: { transform: "rotate(45deg)", borderRadius: "4px", width: "80px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px" },
};

// SVG mini icons for shape selector
function ShapeIcon({ shape, size = 14 }: { shape: CanvasNode["shape"]; size?: number }) {
  const s = size;
  const c = "var(--accent)";
  switch (shape) {
    case "round":
      return <svg width={s} height={s} viewBox="0 0 16 16"><rect x="1" y="3" width="14" height="10" rx="5" fill="none" stroke={c} strokeWidth="1.5"/></svg>;
    case "square":
      return <svg width={s} height={s} viewBox="0 0 16 16"><rect x="1" y="3" width="14" height="10" rx="1" fill="none" stroke={c} strokeWidth="1.5"/></svg>;
    case "circle":
      return <svg width={s} height={s} viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.5"/></svg>;
    case "diamond":
      return <svg width={s} height={s} viewBox="0 0 16 16"><polygon points="8,1 15,8 8,15 1,8" fill="none" stroke={c} strokeWidth="1.5"/></svg>;
  }
}

// Mermaid theme colors for pie chart
const PIE_COLORS = ["#fb923c", "#60a5fa", "#4ade80", "#c4b5fd", "#f472b6", "#fbbf24", "#f87171", "#38bdf8", "#a3e635", "#e879f9"];

// ─── Shared UI components ───
const inputStyle = "px-3 py-2 text-sm rounded-lg outline-none transition-colors";
const inputCSS: React.CSSProperties = { background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" };
const cardCSS: React.CSSProperties = { background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10 };
const accentBtnCSS: React.CSSProperties = { background: "var(--accent-dim)", color: "var(--accent)", border: "1px dashed var(--accent)" };
const delBtnCSS: React.CSSProperties = { color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 6 };
const sectionLabel = "text-[10px] font-semibold uppercase tracking-wider mb-2";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className={sectionLabel} style={{ color: "var(--text-faint)" }}>{children}</div>;
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="text-xs px-4 py-2.5 rounded-lg w-full font-medium" style={accentBtnCSS}>
      {children}
    </button>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onMouseDown={onClick} className="px-2 py-1.5 rounded text-xs font-bold" style={delBtnCSS}>×</button>
  );
}

// ─── Diagram form editors ───
function DiagramFormEditor({ code, onChange }: { code: string; onChange: (c: string) => void }) {
  const type = code.startsWith("sequenceDiagram") ? "sequence"
    : code.startsWith("pie") ? "pie"
    : code.startsWith("gantt") ? "gantt"
    : code.startsWith("erDiagram") ? "er"
    : code.startsWith("mindmap") ? "mindmap"
    : code.startsWith("timeline") ? "timeline"
    : code.startsWith("journey") ? "journey"
    : code.startsWith("quadrantChart") ? "quadrant"
    : code.startsWith("xychart") ? "xychart"
    : code.startsWith("kanban") ? "kanban"
    : code.startsWith("classDiagram") ? "class"
    : code.startsWith("stateDiagram") ? "state"
    : code.startsWith("gitGraph") ? "git"
    : code.startsWith("sankey") ? "sankey"
    : code.startsWith("requirementDiagram") ? "requirement"
    : code.startsWith("block") ? "block"
    : code.startsWith("packet") ? "packet"
    : code.startsWith("architecture") ? "architecture"
    : "raw";

  if (type === "pie") {
    const titleMatch = code.match(/pie\s+title\s+(.+)/);
    const pieTitle = titleMatch?.[1] || "";
    const items = [...code.matchAll(/"([^"]+)"\s*:\s*(\d+)/g)].map(m => ({ label: m[1], value: parseInt(m[2]) }));
    if (items.length === 0) items.push({ label: "Item", value: 50 });
    const total = items.reduce((s, i) => s + i.value, 0) || 1;

    const rebuild = (t: string, itms: { label: string; value: number }[]) => {
      let c = `pie title ${t}\n`;
      itms.forEach(i => { c += `    "${i.label}" : ${i.value}\n`; });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-5 overflow-auto">
        <SectionTitle>Title</SectionTitle>
        <input value={pieTitle} onChange={(e) => rebuild(e.target.value, items)}
          className={`w-full ${inputStyle} font-semibold text-base`} style={inputCSS}
          placeholder="Chart title"
        />

        <SectionTitle>Distribution</SectionTitle>
        <div className="flex rounded-xl overflow-hidden h-8" style={{ border: "1px solid var(--border)" }}>
          {items.map((item, i) => (
            <div key={i} className="relative group"
              style={{ width: `${(item.value / total) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length], minWidth: 4, transition: "width 0.2s" }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-black opacity-0 group-hover:opacity-100 transition-opacity">
                {Math.round((item.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>

        <SectionTitle>Slices ({items.length})</SectionTitle>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3 items-center p-3" style={{ ...cardCSS, borderLeft: `4px solid ${PIE_COLORS[i % PIE_COLORS.length]}` }}>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              <input value={item.label} onChange={(e) => {
                const next = [...items]; next[i] = { ...next[i], label: e.target.value }; rebuild(pieTitle, next);
              }}
                className="flex-1 bg-transparent outline-none text-sm" style={{ color: "var(--text-primary)" }}
                placeholder="Label"
              />
              <div className="flex items-center gap-2">
                <input type="range" min="1" max="100" value={item.value} onChange={(e) => {
                  const next = [...items]; next[i] = { ...next[i], value: parseInt(e.target.value) }; rebuild(pieTitle, next);
                }}
                  className="w-20 accent-[var(--accent)]"
                  style={{ accentColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <input type="number" value={item.value} onChange={(e) => {
                  const next = [...items]; next[i] = { ...next[i], value: parseInt(e.target.value) || 0 }; rebuild(pieTitle, next);
                }}
                  className="w-14 px-2 py-1 text-xs rounded-md outline-none text-right font-mono"
                  style={inputCSS}
                />
                <span className="text-[10px] font-mono w-10 text-right font-semibold"
                  style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>
                  {Math.round((item.value / total) * 100)}%
                </span>
              </div>
              <DeleteBtn onClick={() => rebuild(pieTitle, items.filter((_, j) => j !== i))} />
            </div>
          ))}
        </div>
        <AddButton onClick={() => rebuild(pieTitle, [...items, { label: "New", value: 10 }])}>+ Add Slice</AddButton>
      </div>
    );
  }

  if (type === "sequence") {
    const participants = [...code.matchAll(/participant\s+([\w.:-]+)/g)].map(m => m[1]);
    const messages = [...code.matchAll(/([\w.:-]+)(--?>>?|--?\)|--?>)([\w.:-]+)\s*:\s*(.+)/g)].map(m => ({
      from: m[1], arrow: m[2], to: m[3], text: m[4].trim()
    }));

    const arrowStyles = [
      { value: "->>", label: "Request (solid arrow)", icon: "━━▶" },
      { value: "-->>", label: "Response (dashed arrow)", icon: "╌╌▶" },
      { value: "->", label: "Solid line", icon: "━━━" },
      { value: "-->", label: "Dashed line", icon: "╌╌╌" },
    ];

    const rebuild = (parts: string[], msgs: { from: string; arrow: string; to: string; text: string }[]) => {
      let c = "sequenceDiagram\n";
      parts.forEach(p => { c += `    participant ${p}\n`; });
      msgs.forEach(m => { c += `    ${m.from}${m.arrow}${m.to}: ${m.text}\n`; });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-5 overflow-auto">
        <SectionTitle>Participants ({participants.length})</SectionTitle>
        <div className="flex gap-2 flex-wrap">
          {participants.map((p, i) => (
            <div key={i} className="flex items-center gap-2 p-2 pr-1"
              style={{ ...cardCSS, borderLeft: `4px solid ${PIE_COLORS[i % PIE_COLORS.length]}` }}
            >
              <input value={p} onChange={(e) => {
                const next = [...participants]; const old = next[i]; next[i] = e.target.value;
                rebuild(next, messages.map(m => ({
                  ...m,
                  from: m.from === old ? e.target.value : m.from,
                  to: m.to === old ? e.target.value : m.to,
                })));
              }}
                className="w-24 bg-transparent outline-none text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              />
              <DeleteBtn onClick={() => rebuild(participants.filter((_, j) => j !== i), messages)} />
            </div>
          ))}
          <button onClick={() => rebuild([...participants, `P${participants.length + 1}`], messages)}
            className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg font-medium"
            style={accentBtnCSS}
          >+ Add</button>
        </div>

        <SectionTitle>Messages ({messages.length})</SectionTitle>
        <div className="space-y-2">
          {messages.map((m, i) => {
            const fromIdx = participants.indexOf(m.from);
            const toIdx = participants.indexOf(m.to);
            const fromColor = PIE_COLORS[Math.max(0, fromIdx) % PIE_COLORS.length];
            const toColor = PIE_COLORS[Math.max(0, toIdx) % PIE_COLORS.length];
            const isDashed = m.arrow.startsWith("--");

            return (
              <div key={i} className="p-3" style={cardCSS}>
                {/* Row 1: From → To */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono w-5 text-center shrink-0"
                    style={{ color: "var(--text-faint)" }}>{i + 1}</span>
                  <select value={m.from} onChange={(e) => {
                    const next = [...messages]; next[i] = { ...next[i], from: e.target.value }; rebuild(participants, next);
                  }}
                    className={`w-24 ${inputStyle} text-xs font-semibold`}
                    style={{ ...inputCSS, borderLeft: `3px solid ${fromColor}` }}
                  >
                    {participants.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>

                  {/* Visual arrow */}
                  <div className="flex items-center gap-1 px-1">
                    {arrowStyles.map(a => (
                      <button key={a.value}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const next = [...messages]; next[i] = { ...next[i], arrow: a.value }; rebuild(participants, next);
                        }}
                        className="px-1.5 py-1 rounded text-[10px] font-mono"
                        style={{
                          background: m.arrow === a.value ? "var(--accent)" : "var(--surface)",
                          color: m.arrow === a.value ? "#000" : "var(--text-muted)",
                          border: "1px solid var(--border)",
                        }}
                        title={a.label}
                      >{a.icon}</button>
                    ))}
                  </div>

                  <select value={m.to} onChange={(e) => {
                    const next = [...messages]; next[i] = { ...next[i], to: e.target.value }; rebuild(participants, next);
                  }}
                    className={`w-24 ${inputStyle} text-xs font-semibold`}
                    style={{ ...inputCSS, borderLeft: `3px solid ${toColor}` }}
                  >
                    {participants.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>

                  <DeleteBtn onClick={() => rebuild(participants, messages.filter((_, j) => j !== i))} />
                </div>
                {/* Row 2: Message text */}
                <div className="flex items-center gap-2 ml-7">
                  <span className="text-[10px] shrink-0" style={{ color: "var(--text-faint)" }}>msg:</span>
                  <input value={m.text} onChange={(e) => {
                    const next = [...messages]; next[i] = { ...next[i], text: e.target.value }; rebuild(participants, next);
                  }}
                    className={`flex-1 ${inputStyle} text-xs`} style={inputCSS}
                    placeholder="Message text"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <AddButton onClick={() => rebuild(participants, [...messages, {
          from: participants[0] || "A", arrow: "->>", to: participants[1] || participants[0] || "B", text: "message"
        }])}>+ Add Message</AddButton>
      </div>
    );
  }

  // ─── Gantt ───
  if (type === "gantt" || code.startsWith("gantt")) {
    const titleMatch = code.match(/title\s+(.+)/);
    const ganttTitle = titleMatch?.[1] || "";
    const dateFormat = code.match(/dateFormat\s+(.+)/)?.[1] || "YYYY-MM-DD";
    const sections: { name: string; tasks: { name: string; status: string; date: string }[] }[] = [];
    let currentSection = { name: "Default", tasks: [] as { name: string; status: string; date: string }[] };
    code.split("\n").forEach(line => {
      const secMatch = line.match(/^\s*section\s+(.+)/);
      if (secMatch) {
        if (currentSection.tasks.length > 0 || currentSection.name !== "Default") sections.push(currentSection);
        currentSection = { name: secMatch[1], tasks: [] };
        return;
      }
      const taskMatch = line.match(/^\s+(.+?)\s*:\s*(.+)/);
      if (taskMatch && !line.includes("title") && !line.includes("dateFormat")) {
        const parts = taskMatch[2].split(",").map(s => s.trim());
        currentSection.tasks.push({ name: taskMatch[1], status: parts[0] || "", date: parts.slice(1).join(", ") || "" });
      }
    });
    if (currentSection.tasks.length > 0 || sections.length === 0) sections.push(currentSection);

    const rebuild = () => {
      let c = `gantt\n    title ${ganttTitle}\n    dateFormat ${dateFormat}\n`;
      sections.forEach(s => {
        c += `    section ${s.name}\n`;
        s.tasks.forEach(t => { c += `    ${t.name} :${t.status}${t.date ? ", " + t.date : ""}\n`; });
      });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>Gantt Chart</SectionTitle>
        <input value={ganttTitle} onChange={(e) => { const t = e.target.value; code = code.replace(/title\s+.+/, `title ${t}`); onChange(code); }}
          className={`w-full ${inputStyle} font-semibold`} style={inputCSS} placeholder="Chart title" />
        {sections.map((sec, si) => (
          <div key={si} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 rounded" style={{ background: PIE_COLORS[si % PIE_COLORS.length] }} />
              <input value={sec.name} onChange={(e) => { sections[si].name = e.target.value; rebuild(); }}
                className="bg-transparent outline-none text-sm font-semibold" style={{ color: "var(--text-primary)" }}
                placeholder="Section name" />
              <DeleteBtn onClick={() => { sections.splice(si, 1); rebuild(); }} />
            </div>
            {sec.tasks.map((task, ti) => (
              <div key={ti} className="flex gap-2 items-center ml-3 p-2" style={cardCSS}>
                <input value={task.name} onChange={(e) => { sections[si].tasks[ti].name = e.target.value; rebuild(); }}
                  className="flex-1 bg-transparent outline-none text-xs" style={{ color: "var(--text-primary)" }} placeholder="Task" />
                <input value={task.status} onChange={(e) => { sections[si].tasks[ti].status = e.target.value; rebuild(); }}
                  className="w-16 bg-transparent outline-none text-xs font-mono" style={{ color: "var(--accent)" }} placeholder="status" />
                <input value={task.date} onChange={(e) => { sections[si].tasks[ti].date = e.target.value; rebuild(); }}
                  className="w-32 bg-transparent outline-none text-xs font-mono" style={{ color: "var(--text-muted)" }} placeholder="date, duration" />
                <DeleteBtn onClick={() => { sections[si].tasks.splice(ti, 1); rebuild(); }} />
              </div>
            ))}
            <button onClick={() => { sec.tasks.push({ name: "New task", status: "", date: "2026-01-01, 3d" }); rebuild(); }}
              className="ml-3 text-[10px] px-3 py-1 rounded" style={accentBtnCSS}>+ Task</button>
          </div>
        ))}
        <AddButton onClick={() => { sections.push({ name: "New Section", tasks: [{ name: "Task", status: "", date: "2026-01-01, 5d" }] }); rebuild(); }}>+ Add Section</AddButton>
      </div>
    );
  }

  // ─── ER Diagram ───
  if (code.startsWith("erDiagram")) {
    const entities = [...code.matchAll(/([\w]+)\s*\{([^}]*)\}/g)].map(m => ({
      name: m[1],
      attrs: m[2].trim().split("\n").map(a => a.trim()).filter(Boolean).map(a => { const p = a.split(/\s+/); return { type: p[0] || "string", name: p[1] || "" }; })
    }));
    const rels = [...code.matchAll(/([\w]+)\s*(\|[o|]{1,2}--[o|]{1,2}\||\}[o|]--[o|]\{|[|}{o]+-*-*[|}{o]+)\s*([\w]+)\s*:\s*"?([^"\n]*)"?/g)].map(m => ({
      from: m[1], rel: m[2], to: m[3], label: m[4]
    }));

    const rebuild = (ents: typeof entities, rs: typeof rels) => {
      let c = "erDiagram\n";
      ents.forEach(e => { c += `    ${e.name} {\n`; e.attrs.forEach(a => { c += `        ${a.type} ${a.name}\n`; }); c += `    }\n`; });
      rs.forEach(r => { c += `    ${r.from} ${r.rel} ${r.to} : "${r.label}"\n`; });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>ER Diagram — Entities ({entities.length})</SectionTitle>
        {entities.map((ent, ei) => (
          <div key={ei} className="p-3 space-y-2" style={{ ...cardCSS, borderLeft: `4px solid ${PIE_COLORS[ei % PIE_COLORS.length]}` }}>
            <div className="flex items-center gap-2">
              <input value={ent.name} onChange={(e) => { entities[ei].name = e.target.value; rebuild(entities, rels); }}
                className="bg-transparent outline-none text-sm font-bold" style={{ color: "var(--text-primary)" }} />
              <DeleteBtn onClick={() => rebuild(entities.filter((_, j) => j !== ei), rels)} />
            </div>
            {ent.attrs.map((attr, ai) => (
              <div key={ai} className="flex gap-2 ml-2">
                <input value={attr.type} onChange={(e) => { entities[ei].attrs[ai].type = e.target.value; rebuild(entities, rels); }}
                  className="w-20 text-xs font-mono bg-transparent outline-none" style={{ color: "var(--accent)" }} placeholder="type" />
                <input value={attr.name} onChange={(e) => { entities[ei].attrs[ai].name = e.target.value; rebuild(entities, rels); }}
                  className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-primary)" }} placeholder="name" />
                <DeleteBtn onClick={() => { entities[ei].attrs.splice(ai, 1); rebuild(entities, rels); }} />
              </div>
            ))}
            <button onClick={() => { ent.attrs.push({ type: "string", name: "field" }); rebuild(entities, rels); }}
              className="ml-2 text-[10px] px-2 py-1 rounded" style={accentBtnCSS}>+ Attr</button>
          </div>
        ))}
        <AddButton onClick={() => rebuild([...entities, { name: "Entity", attrs: [{ type: "int", name: "id" }] }], rels)}>+ Add Entity</AddButton>

        <SectionTitle>Relationships ({rels.length})</SectionTitle>
        {rels.map((r, ri) => (
          <div key={ri} className="flex gap-2 items-center p-2" style={cardCSS}>
            <select value={r.from} onChange={(e) => { rels[ri].from = e.target.value; rebuild(entities, rels); }}
              className={`w-24 ${inputStyle} text-xs`} style={inputCSS}>
              {entities.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
            </select>
            <input value={r.rel} onChange={(e) => { rels[ri].rel = e.target.value; rebuild(entities, rels); }}
              className="w-20 text-xs font-mono text-center bg-transparent outline-none" style={{ color: "var(--accent)" }} />
            <select value={r.to} onChange={(e) => { rels[ri].to = e.target.value; rebuild(entities, rels); }}
              className={`w-24 ${inputStyle} text-xs`} style={inputCSS}>
              {entities.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
            </select>
            <input value={r.label} onChange={(e) => { rels[ri].label = e.target.value; rebuild(entities, rels); }}
              className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-primary)" }} placeholder="label" />
            <DeleteBtn onClick={() => rebuild(entities, rels.filter((_, j) => j !== ri))} />
          </div>
        ))}
        <AddButton onClick={() => rebuild(entities, [...rels, { from: entities[0]?.name || "A", rel: "||--o{", to: entities[1]?.name || "B", label: "has" }])}>+ Add Relationship</AddButton>
      </div>
    );
  }

  // ─── Mindmap ───
  if (code.startsWith("mindmap")) {
    const lines = code.split("\n").slice(1).filter(l => l.trim());
    const items = lines.map(l => {
      const indent = l.search(/\S/);
      const text = l.trim();
      return { indent: Math.floor(indent / 2), text };
    });
    if (items.length === 0) items.push({ indent: 0, text: "Central Topic" });

    const rebuild = (itms: typeof items) => {
      let c = "mindmap\n";
      itms.forEach(i => { c += "  ".repeat(i.indent + 1) + i.text + "\n"; });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>Mindmap</SectionTitle>
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center" style={{ marginLeft: item.indent * 20 }}>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[item.indent % PIE_COLORS.length] }} />
            <input value={item.text} onChange={(e) => { items[i].text = e.target.value; rebuild(items); }}
              className="flex-1 bg-transparent outline-none text-sm" style={{ color: "var(--text-primary)" }} />
            <button onMouseDown={() => { if (item.indent > 0) { items[i].indent--; rebuild(items); } }}
              className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--surface)" }}>◀</button>
            <button onMouseDown={() => { items[i].indent++; rebuild(items); }}
              className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--surface)" }}>▶</button>
            <DeleteBtn onClick={() => rebuild(items.filter((_, j) => j !== i))} />
          </div>
        ))}
        <AddButton onClick={() => rebuild([...items, { indent: 1, text: "New topic" }])}>+ Add Topic</AddButton>
      </div>
    );
  }

  // ─── Timeline ───
  if (code.startsWith("timeline")) {
    const titleMatch = code.match(/title\s+(.+)/);
    const tlTitle = titleMatch?.[1] || "";
    const events: { period: string; items: string[] }[] = [];
    let current: { period: string; items: string[] } | null = null;
    code.split("\n").forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "timeline" || trimmed.startsWith("title")) return;
      if (!line.startsWith("    ") && !line.startsWith("\t\t")) {
        if (current) events.push(current);
        current = { period: trimmed, items: [] };
      } else if (current) {
        current.items.push(trimmed.replace(/^:\s*/, ""));
      }
    });
    if (current) events.push(current);
    if (events.length === 0) events.push({ period: "2026", items: ["Event"] });

    const rebuild = () => {
      let c = `timeline\n    title ${tlTitle}\n`;
      events.forEach(e => {
        c += `    ${e.period}\n`;
        e.items.forEach(item => { c += `        : ${item}\n`; });
      });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>Timeline</SectionTitle>
        <input value={tlTitle} onChange={(e) => { code = code.replace(/title\s+.+/, `title ${e.target.value}`); onChange(code); }}
          className={`w-full ${inputStyle} font-semibold`} style={inputCSS} placeholder="Timeline title" />
        {events.map((ev, ei) => (
          <div key={ei} className="p-3 space-y-2" style={{ ...cardCSS, borderLeft: `4px solid ${PIE_COLORS[ei % PIE_COLORS.length]}` }}>
            <div className="flex items-center gap-2">
              <input value={ev.period} onChange={(e) => { events[ei].period = e.target.value; rebuild(); }}
                className="bg-transparent outline-none text-sm font-bold" style={{ color: PIE_COLORS[ei % PIE_COLORS.length] }} placeholder="Period" />
              <DeleteBtn onClick={() => { events.splice(ei, 1); rebuild(); }} />
            </div>
            {ev.items.map((item, ii) => (
              <div key={ii} className="flex gap-2 ml-3">
                <input value={item} onChange={(e) => { events[ei].items[ii] = e.target.value; rebuild(); }}
                  className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-primary)" }} />
                <DeleteBtn onClick={() => { events[ei].items.splice(ii, 1); rebuild(); }} />
              </div>
            ))}
            <button onClick={() => { ev.items.push("New event"); rebuild(); }}
              className="ml-3 text-[10px] px-2 py-1 rounded" style={accentBtnCSS}>+ Event</button>
          </div>
        ))}
        <AddButton onClick={() => { events.push({ period: "Period", items: ["Event"] }); rebuild(); }}>+ Add Period</AddButton>
      </div>
    );
  }

  // ─── Journey ───
  if (code.startsWith("journey")) {
    const titleMatch = code.match(/title\s+(.+)/);
    const jTitle = titleMatch?.[1] || "";
    const sections: { name: string; tasks: { name: string; rating: number; actors: string }[] }[] = [];
    let currentSec = { name: "", tasks: [] as { name: string; rating: number; actors: string }[] };
    code.split("\n").forEach(line => {
      const secMatch = line.match(/^\s*section\s+(.+)/);
      if (secMatch) {
        if (currentSec.tasks.length > 0) sections.push(currentSec);
        currentSec = { name: secMatch[1], tasks: [] };
        return;
      }
      const taskMatch = line.match(/^\s+(.+?)\s*:\s*(\d+)\s*(?::\s*(.+))?/);
      if (taskMatch && !line.includes("title")) {
        currentSec.tasks.push({ name: taskMatch[1].trim(), rating: parseInt(taskMatch[2]), actors: taskMatch[3]?.trim() || "" });
      }
    });
    if (currentSec.tasks.length > 0) sections.push(currentSec);
    if (sections.length === 0) sections.push({ name: "Section", tasks: [{ name: "Task", rating: 5, actors: "User" }] });

    const rebuild = () => {
      let c = `journey\n    title ${jTitle}\n`;
      sections.forEach(s => {
        c += `    section ${s.name}\n`;
        s.tasks.forEach(t => { c += `      ${t.name}: ${t.rating}${t.actors ? ": " + t.actors : ""}\n`; });
      });
      onChange(c.trim());
    };

    const ratingColor = (r: number) => r >= 4 ? "#4ade80" : r >= 3 ? "#fbbf24" : "#ef4444";

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>User Journey</SectionTitle>
        <input value={jTitle} onChange={(e) => { code = code.replace(/title\s+.+/, `title ${e.target.value}`); onChange(code); }}
          className={`w-full ${inputStyle} font-semibold`} style={inputCSS} placeholder="Journey title" />
        {sections.map((sec, si) => (
          <div key={si} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 rounded" style={{ background: PIE_COLORS[si % PIE_COLORS.length] }} />
              <input value={sec.name} onChange={(e) => { sections[si].name = e.target.value; rebuild(); }}
                className="bg-transparent outline-none text-sm font-semibold" style={{ color: "var(--text-primary)" }} />
              <DeleteBtn onClick={() => { sections.splice(si, 1); rebuild(); }} />
            </div>
            {sec.tasks.map((task, ti) => (
              <div key={ti} className="flex gap-2 items-center ml-3 p-2" style={cardCSS}>
                <input value={task.name} onChange={(e) => { sections[si].tasks[ti].name = e.target.value; rebuild(); }}
                  className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-primary)" }} placeholder="Task" />
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(r => (
                    <button key={r} onMouseDown={() => { sections[si].tasks[ti].rating = r; rebuild(); }}
                      className="w-5 h-5 rounded-full text-[9px] font-bold"
                      style={{ background: task.rating >= r ? ratingColor(r) : "var(--surface)", color: task.rating >= r ? "#000" : "var(--text-faint)", border: "1px solid var(--border)" }}>
                      {r}
                    </button>
                  ))}
                </div>
                <input value={task.actors} onChange={(e) => { sections[si].tasks[ti].actors = e.target.value; rebuild(); }}
                  className="w-20 text-xs bg-transparent outline-none" style={{ color: "var(--text-muted)" }} placeholder="actors" />
                <DeleteBtn onClick={() => { sections[si].tasks.splice(ti, 1); rebuild(); }} />
              </div>
            ))}
            <button onClick={() => { sec.tasks.push({ name: "New task", rating: 3, actors: "" }); rebuild(); }}
              className="ml-3 text-[10px] px-2 py-1 rounded" style={accentBtnCSS}>+ Task</button>
          </div>
        ))}
        <AddButton onClick={() => { sections.push({ name: "Section", tasks: [{ name: "Task", rating: 5, actors: "" }] }); rebuild(); }}>+ Add Section</AddButton>
      </div>
    );
  }

  // ─── Quadrant Chart ───
  if (code.startsWith("quadrantChart")) {
    const title = code.match(/title\s+(.+)/)?.[1] || "";
    const xLabel = code.match(/x-axis\s+"([^"]+)"/)?.[1] || "";
    const yLabel = code.match(/y-axis\s+"([^"]+)"/)?.[1] || "";
    const xRight = code.match(/x-axis\s+"[^"]+"\s+-->\s+"([^"]+)"/)?.[1] || "";
    const yTop = code.match(/y-axis\s+"[^"]+"\s+-->\s+"([^"]+)"/)?.[1] || "";
    const points = [...code.matchAll(/([\w\s]+?):\s*\[([0-9.]+),\s*([0-9.]+)\]/g)].map(m => ({
      name: m[1].trim(), x: parseFloat(m[2]), y: parseFloat(m[3])
    }));

    const rebuild = () => {
      let c = `quadrantChart\n    title ${title}\n    x-axis "${xLabel}" --> "${xRight}"\n    y-axis "${yLabel}" --> "${yTop}"\n`;
      points.forEach(p => { c += `    ${p.name}: [${p.x}, ${p.y}]\n`; });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>Quadrant Chart</SectionTitle>
        <input value={title} onChange={(e) => { code = code.replace(/title\s+.+/, `title ${e.target.value}`); onChange(code); }}
          className={`w-full ${inputStyle} font-semibold`} style={inputCSS} placeholder="Title" />
        <div className="grid grid-cols-2 gap-2">
          <input value={xLabel} onChange={(e) => { code = code.replace(/x-axis\s+"[^"]+"/, `x-axis "${e.target.value}"`); onChange(code); }}
            className={`${inputStyle} text-xs`} style={inputCSS} placeholder="X-axis left" />
          <input value={xRight} onChange={(e) => { code = code.replace(/-->\s+"[^"]+"/, `--> "${e.target.value}"`); onChange(code); }}
            className={`${inputStyle} text-xs`} style={inputCSS} placeholder="X-axis right" />
        </div>
        <SectionTitle>Data Points ({points.length})</SectionTitle>
        {points.map((p, i) => (
          <div key={i} className="flex gap-2 items-center p-2" style={cardCSS}>
            <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            <input value={p.name} onChange={(e) => { points[i].name = e.target.value; rebuild(); }}
              className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-primary)" }} />
            <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>x:</span>
            <input type="number" step="0.1" min="0" max="1" value={p.x} onChange={(e) => { points[i].x = parseFloat(e.target.value) || 0; rebuild(); }}
              className="w-14 text-xs font-mono rounded px-1 py-0.5 outline-none" style={inputCSS} />
            <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>y:</span>
            <input type="number" step="0.1" min="0" max="1" value={p.y} onChange={(e) => { points[i].y = parseFloat(e.target.value) || 0; rebuild(); }}
              className="w-14 text-xs font-mono rounded px-1 py-0.5 outline-none" style={inputCSS} />
            <DeleteBtn onClick={() => rebuild()} />
          </div>
        ))}
        <AddButton onClick={() => { points.push({ name: "Item", x: 0.5, y: 0.5 }); rebuild(); }}>+ Add Point</AddButton>
      </div>
    );
  }

  // ─── Kanban ───
  if (code.startsWith("kanban")) {
    const cols: { name: string; items: string[] }[] = [];
    let current: { name: string; items: string[] } | null = null;
    code.split("\n").forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "kanban") return;
      if (!line.startsWith("  ") && !line.startsWith("\t")) {
        if (current) cols.push(current);
        current = { name: trimmed, items: [] };
      } else if (current) {
        current.items.push(trimmed);
      }
    });
    if (current) cols.push(current);
    if (cols.length === 0) cols.push({ name: "To Do", items: ["Task 1"] });

    const rebuild = () => {
      let c = "kanban\n";
      cols.forEach(col => {
        c += `  ${col.name}\n`;
        col.items.forEach(item => { c += `    ${item}\n`; });
      });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>Kanban Board</SectionTitle>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {cols.map((col, ci) => (
            <div key={ci} className="min-w-[180px] p-3 space-y-2 shrink-0" style={{ ...cardCSS, borderTop: `3px solid ${PIE_COLORS[ci % PIE_COLORS.length]}` }}>
              <div className="flex items-center gap-1">
                <input value={col.name} onChange={(e) => { cols[ci].name = e.target.value; rebuild(); }}
                  className="bg-transparent outline-none text-xs font-bold flex-1" style={{ color: "var(--text-primary)" }} />
                <DeleteBtn onClick={() => { cols.splice(ci, 1); rebuild(); }} />
              </div>
              {col.items.map((item, ii) => (
                <div key={ii} className="flex gap-1 items-center p-1.5 rounded" style={{ background: "var(--surface)" }}>
                  <input value={item} onChange={(e) => { cols[ci].items[ii] = e.target.value; rebuild(); }}
                    className="flex-1 text-[11px] bg-transparent outline-none" style={{ color: "var(--text-secondary)" }} />
                  <button onMouseDown={() => { cols[ci].items.splice(ii, 1); rebuild(); }}
                    className="text-[9px]" style={{ color: "var(--text-faint)" }}>×</button>
                </div>
              ))}
              <button onClick={() => { col.items.push("New item"); rebuild(); }}
                className="w-full text-[10px] py-1 rounded" style={{ color: "var(--text-faint)", border: "1px dashed var(--border)" }}>+</button>
            </div>
          ))}
          <button onClick={() => { cols.push({ name: "Column", items: [] }); rebuild(); }}
            className="min-w-[60px] flex items-center justify-center rounded-lg text-sm"
            style={accentBtnCSS}>+</button>
        </div>
      </div>
    );
  }

  // ─── XY Chart ───
  if (code.startsWith("xychart-beta")) {
    const title = code.match(/title\s+"([^"]+)"/)?.[1] || "";
    const xVals = code.match(/x-axis\s+\[([^\]]+)\]/)?.[1]?.split(",").map(s => s.trim().replace(/"/g, "")) || [];
    const lines = [...code.matchAll(/(?:line|bar)\s+\[([^\]]+)\]/g)].map((m, i) => ({
      type: code.split("\n").find(l => l.includes(m[1]))?.trim().startsWith("bar") ? "bar" : "line",
      values: m[1].split(",").map(s => parseFloat(s.trim()))
    }));

    const rebuild = () => {
      let c = `xychart-beta\n    title "${title}"\n    x-axis [${xVals.map(v => `"${v}"`).join(", ")}]\n`;
      lines.forEach(l => { c += `    ${l.type} [${l.values.join(", ")}]\n`; });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>XY Chart</SectionTitle>
        <input value={title} onChange={(e) => { code = code.replace(/title\s+"[^"]+"/, `title "${e.target.value}"`); onChange(code); }}
          className={`w-full ${inputStyle} font-semibold`} style={inputCSS} placeholder="Title" />
        <SectionTitle>X-Axis Labels</SectionTitle>
        <div className="flex gap-1 flex-wrap">
          {xVals.map((v, i) => (
            <input key={i} value={v} onChange={(e) => { xVals[i] = e.target.value; rebuild(); }}
              className="w-16 text-xs font-mono rounded px-2 py-1 outline-none" style={inputCSS} />
          ))}
          <button onClick={() => { xVals.push(`v${xVals.length + 1}`); rebuild(); }}
            className="text-[10px] px-2 py-1 rounded" style={accentBtnCSS}>+</button>
        </div>
        <SectionTitle>Data Series ({lines.length})</SectionTitle>
        {lines.map((l, li) => (
          <div key={li} className="p-2 space-y-1" style={{ ...cardCSS, borderLeft: `4px solid ${PIE_COLORS[li % PIE_COLORS.length]}` }}>
            <div className="flex items-center gap-2">
              <select value={l.type} onChange={(e) => { lines[li].type = e.target.value; rebuild(); }}
                className="text-xs rounded px-2 py-1 outline-none" style={inputCSS}>
                <option value="line">Line</option>
                <option value="bar">Bar</option>
              </select>
              <DeleteBtn onClick={() => { lines.splice(li, 1); rebuild(); }} />
            </div>
            <div className="flex gap-1 flex-wrap">
              {l.values.map((v, vi) => (
                <input key={vi} type="number" value={v} onChange={(e) => { lines[li].values[vi] = parseFloat(e.target.value) || 0; rebuild(); }}
                  className="w-14 text-xs font-mono rounded px-1 py-0.5 outline-none" style={inputCSS} />
              ))}
            </div>
          </div>
        ))}
        <AddButton onClick={() => { lines.push({ type: "bar", values: xVals.map(() => 0) }); rebuild(); }}>+ Add Series</AddButton>
      </div>
    );
  }

  // ─── Class Diagram ───
  if (code.startsWith("classDiagram")) {
    const classes = [...code.matchAll(/class\s+(\w+)\s*\{([^}]*)\}/g)].map(m => ({
      name: m[1],
      members: m[2].trim().split("\n").map(l => l.trim()).filter(Boolean)
    }));
    // Also detect classes from relationships
    const relClasses = [...code.matchAll(/(\w+)\s*(?:<\||--|\*--|o--|\.\.>|-->)\s*(\w+)/g)];
    const allClassNames = new Set([...classes.map(c => c.name), ...relClasses.flatMap(m => [m[1], m[2]])]);
    classes.forEach(c => allClassNames.delete(c.name));
    allClassNames.forEach(name => classes.push({ name, members: [] }));

    const rels = [...code.matchAll(/(\w+)\s*((?:<\||\*|o)?--(?:\|>|\*|o)?|\.\.>|-->)\s*(\w+)\s*(?::\s*(.+))?/g)].map(m => ({
      from: m[1], rel: m[2], to: m[3], label: m[4]?.trim() || ""
    }));

    const rebuild = () => {
      let c = "classDiagram\n";
      classes.forEach(cl => {
        c += `    class ${cl.name} {\n`;
        cl.members.forEach(m => { c += `        ${m}\n`; });
        c += `    }\n`;
      });
      rels.forEach(r => { c += `    ${r.from} ${r.rel} ${r.to}${r.label ? " : " + r.label : ""}\n`; });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>Class Diagram — Classes ({classes.length})</SectionTitle>
        {classes.map((cl, ci) => (
          <div key={ci} className="p-3 space-y-1" style={{ ...cardCSS, borderLeft: `4px solid ${PIE_COLORS[ci % PIE_COLORS.length]}` }}>
            <div className="flex items-center gap-2">
              <input value={cl.name} onChange={(e) => { classes[ci].name = e.target.value; rebuild(); }}
                className="bg-transparent outline-none text-sm font-bold" style={{ color: "var(--text-primary)" }} />
              <DeleteBtn onClick={() => { classes.splice(ci, 1); rebuild(); }} />
            </div>
            {cl.members.map((mem, mi) => (
              <div key={mi} className="flex gap-2 ml-2">
                <input value={mem} onChange={(e) => { classes[ci].members[mi] = e.target.value; rebuild(); }}
                  className="flex-1 text-xs font-mono bg-transparent outline-none" style={{ color: "var(--text-secondary)" }} />
                <DeleteBtn onClick={() => { classes[ci].members.splice(mi, 1); rebuild(); }} />
              </div>
            ))}
            <button onClick={() => { cl.members.push("+method()"); rebuild(); }}
              className="ml-2 text-[10px] px-2 py-1 rounded" style={accentBtnCSS}>+ Member</button>
          </div>
        ))}
        <AddButton onClick={() => { classes.push({ name: "NewClass", members: ["+attribute", "+method()"] }); rebuild(); }}>+ Add Class</AddButton>
        <SectionTitle>Relationships ({rels.length})</SectionTitle>
        {rels.map((r, ri) => (
          <div key={ri} className="flex gap-2 items-center p-2" style={cardCSS}>
            <select value={r.from} onChange={(e) => { rels[ri].from = e.target.value; rebuild(); }}
              className={`w-24 ${inputStyle} text-xs`} style={inputCSS}>
              {classes.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <select value={r.rel} onChange={(e) => { rels[ri].rel = e.target.value; rebuild(); }}
              className="w-16 text-xs font-mono text-center rounded px-1 py-1 outline-none" style={inputCSS}>
              {["<|--", "*--", "o--", "-->", "..|>", "..>", "--"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={r.to} onChange={(e) => { rels[ri].to = e.target.value; rebuild(); }}
              className={`w-24 ${inputStyle} text-xs`} style={inputCSS}>
              {classes.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <input value={r.label} onChange={(e) => { rels[ri].label = e.target.value; rebuild(); }}
              className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-primary)" }} placeholder="label" />
            <DeleteBtn onClick={() => { rels.splice(ri, 1); rebuild(); }} />
          </div>
        ))}
        <AddButton onClick={() => { rels.push({ from: classes[0]?.name || "A", rel: "-->", to: classes[1]?.name || "B", label: "" }); rebuild(); }}>+ Add Relationship</AddButton>
      </div>
    );
  }

  // ─── State Diagram ───
  if (code.startsWith("stateDiagram")) {
    const states = [...code.matchAll(/^\s+([\w]+)(?:\s*:\s*(.+))?$/gm)]
      .filter(m => !["[*]", "state", "note"].includes(m[1]))
      .map(m => ({ name: m[1], label: m[2]?.trim() || "" }));
    const transitions = [...code.matchAll(/([\w\[\]*]+)\s*-->\s*([\w\[\]*]+)(?:\s*:\s*(.+))?/g)].map(m => ({
      from: m[1], to: m[2], label: m[3]?.trim() || ""
    }));
    const stateNames = [...new Set([...states.map(s => s.name), ...transitions.flatMap(t => [t.from, t.to])])].filter(s => s !== "[*]");

    const rebuild = () => {
      let c = "stateDiagram-v2\n";
      states.filter(s => s.label).forEach(s => { c += `    ${s.name} : ${s.label}\n`; });
      transitions.forEach(t => { c += `    ${t.from} --> ${t.to}${t.label ? " : " + t.label : ""}\n`; });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>State Diagram — States ({stateNames.length})</SectionTitle>
        {stateNames.map((name, i) => {
          const state = states.find(s => s.name === name);
          return (
            <div key={i} className="flex gap-2 items-center p-2" style={{ ...cardCSS, borderLeft: `4px solid ${PIE_COLORS[i % PIE_COLORS.length]}` }}>
              <input value={name} onChange={(e) => {
                const old = name;
                stateNames[i] = e.target.value;
                if (state) state.name = e.target.value;
                transitions.forEach(t => { if (t.from === old) t.from = e.target.value; if (t.to === old) t.to = e.target.value; });
                rebuild();
              }}
                className="w-24 bg-transparent outline-none text-sm font-semibold" style={{ color: "var(--text-primary)" }} />
              <input value={state?.label || ""} onChange={(e) => {
                if (state) state.label = e.target.value;
                else states.push({ name, label: e.target.value });
                rebuild();
              }}
                className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-muted)" }} placeholder="description" />
            </div>
          );
        })}
        <AddButton onClick={() => { const n = `S${stateNames.length + 1}`; states.push({ name: n, label: "" }); stateNames.push(n); rebuild(); }}>+ Add State</AddButton>
        <SectionTitle>Transitions ({transitions.length})</SectionTitle>
        {transitions.map((t, ti) => (
          <div key={ti} className="flex gap-2 items-center p-2" style={cardCSS}>
            <select value={t.from} onChange={(e) => { transitions[ti].from = e.target.value; rebuild(); }}
              className={`w-24 ${inputStyle} text-xs`} style={inputCSS}>
              <option value="[*]">[*] start</option>
              {stateNames.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span style={{ color: "var(--accent)" }}>→</span>
            <select value={t.to} onChange={(e) => { transitions[ti].to = e.target.value; rebuild(); }}
              className={`w-24 ${inputStyle} text-xs`} style={inputCSS}>
              {stateNames.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="[*]">[*] end</option>
            </select>
            <input value={t.label} onChange={(e) => { transitions[ti].label = e.target.value; rebuild(); }}
              className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-primary)" }} placeholder="trigger" />
            <DeleteBtn onClick={() => { transitions.splice(ti, 1); rebuild(); }} />
          </div>
        ))}
        <AddButton onClick={() => { transitions.push({ from: stateNames[0] || "[*]", to: stateNames[1] || stateNames[0] || "S1", label: "" }); rebuild(); }}>+ Add Transition</AddButton>
      </div>
    );
  }

  // ─── Git Graph ───
  if (code.startsWith("gitGraph")) {
    const commands: { type: string; value: string }[] = [];
    code.split("\n").forEach(line => {
      const t = line.trim();
      if (t.startsWith("commit")) commands.push({ type: "commit", value: t.match(/id:\s*"([^"]+)"/)?.[1] || "" });
      else if (t.startsWith("branch")) commands.push({ type: "branch", value: t.replace("branch ", "") });
      else if (t.startsWith("checkout")) commands.push({ type: "checkout", value: t.replace("checkout ", "") });
      else if (t.startsWith("merge")) commands.push({ type: "merge", value: t.replace("merge ", "") });
    });
    if (commands.length === 0) commands.push({ type: "commit", value: "Initial" });

    const rebuild = () => {
      let c = "gitGraph\n";
      commands.forEach(cmd => {
        if (cmd.type === "commit") c += `    commit${cmd.value ? ` id: "${cmd.value}"` : ""}\n`;
        else c += `    ${cmd.type} ${cmd.value}\n`;
      });
      onChange(c.trim());
    };

    const cmdColors: Record<string, string> = { commit: "#4ade80", branch: "#60a5fa", checkout: "#fbbf24", merge: "#f472b6" };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>Git Graph</SectionTitle>
        {commands.map((cmd, i) => (
          <div key={i} className="flex gap-2 items-center p-2" style={{ ...cardCSS, borderLeft: `4px solid ${cmdColors[cmd.type] || "var(--border)"}` }}>
            <select value={cmd.type} onChange={(e) => { commands[i].type = e.target.value; rebuild(); }}
              className="w-24 text-xs font-mono rounded px-2 py-1.5 outline-none font-semibold"
              style={{ ...inputCSS, color: cmdColors[cmd.type] }}>
              {["commit", "branch", "checkout", "merge"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={cmd.value} onChange={(e) => { commands[i].value = e.target.value; rebuild(); }}
              className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-primary)" }}
              placeholder={cmd.type === "commit" ? "commit message" : "branch name"} />
            <DeleteBtn onClick={() => { commands.splice(i, 1); rebuild(); }} />
          </div>
        ))}
        <AddButton onClick={() => { commands.push({ type: "commit", value: "" }); rebuild(); }}>+ Add Command</AddButton>
      </div>
    );
  }

  // ─── Sankey ───
  if (code.startsWith("sankey")) {
    const dataLines = code.split("\n").slice(1).filter(l => l.trim() && !l.trim().startsWith("sankey"));
    const flows = dataLines.map(line => {
      const parts = line.split(",").map(s => s.trim());
      return { from: parts[0] || "", to: parts[1] || "", value: parts[2] || "10" };
    });
    if (flows.length === 0) flows.push({ from: "Source", to: "Target", value: "10" });

    const rebuild = () => {
      let c = "sankey-beta\n\n";
      flows.forEach(f => { c += `${f.from},${f.to},${f.value}\n`; });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>Sankey Diagram — Flows ({flows.length})</SectionTitle>
        {flows.map((f, i) => (
          <div key={i} className="flex gap-2 items-center p-2" style={cardCSS}>
            <input value={f.from} onChange={(e) => { flows[i].from = e.target.value; rebuild(); }}
              className={`w-28 ${inputStyle} text-xs`} style={inputCSS} placeholder="Source" />
            <span style={{ color: "var(--accent)" }}>→</span>
            <input value={f.to} onChange={(e) => { flows[i].to = e.target.value; rebuild(); }}
              className={`w-28 ${inputStyle} text-xs`} style={inputCSS} placeholder="Target" />
            <input type="number" value={f.value} onChange={(e) => { flows[i].value = e.target.value; rebuild(); }}
              className="w-16 text-xs font-mono rounded px-2 py-1 outline-none text-right" style={inputCSS} />
            <DeleteBtn onClick={() => { flows.splice(i, 1); rebuild(); }} />
          </div>
        ))}
        <AddButton onClick={() => { flows.push({ from: "Node", to: "Target", value: "10" }); rebuild(); }}>+ Add Flow</AddButton>
      </div>
    );
  }

  // ─── Requirement Diagram ───
  if (code.startsWith("requirementDiagram")) {
    const reqs = [...code.matchAll(/requirement\s+(\w+)\s*\{([^}]*)\}/g)].map(m => {
      const body = m[2];
      return {
        name: m[1],
        id: body.match(/id:\s*(.+)/)?.[1]?.trim() || "",
        text: body.match(/text:\s*(.+)/)?.[1]?.trim() || "",
        risk: body.match(/risk:\s*(.+)/)?.[1]?.trim() || "low",
      };
    });
    const elements = [...code.matchAll(/element\s+(\w+)\s*\{([^}]*)\}/g)].map(m => ({
      name: m[1], type: m[2].match(/type:\s*(.+)/)?.[1]?.trim() || "",
    }));

    const rebuild = () => {
      let c = "requirementDiagram\n\n";
      reqs.forEach(r => {
        c += `    requirement ${r.name} {\n        id: ${r.id}\n        text: ${r.text}\n        risk: ${r.risk}\n    }\n\n`;
      });
      elements.forEach(e => { c += `    element ${e.name} {\n        type: ${e.type}\n    }\n\n`; });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>Requirements ({reqs.length})</SectionTitle>
        {reqs.map((r, ri) => (
          <div key={ri} className="p-3 space-y-1" style={{ ...cardCSS, borderLeft: `4px solid ${PIE_COLORS[ri % PIE_COLORS.length]}` }}>
            <input value={r.name} onChange={(e) => { reqs[ri].name = e.target.value; rebuild(); }}
              className="bg-transparent outline-none text-sm font-bold" style={{ color: "var(--text-primary)" }} />
            <div className="flex gap-2 ml-1">
              <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>id:</span>
              <input value={r.id} onChange={(e) => { reqs[ri].id = e.target.value; rebuild(); }}
                className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="flex gap-2 ml-1">
              <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>text:</span>
              <input value={r.text} onChange={(e) => { reqs[ri].text = e.target.value; rebuild(); }}
                className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-primary)" }} />
            </div>
            <div className="flex gap-2 ml-1 items-center">
              <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>risk:</span>
              {["low", "medium", "high"].map(risk => (
                <button key={risk} onMouseDown={() => { reqs[ri].risk = risk; rebuild(); }}
                  className="text-[10px] px-2 py-0.5 rounded"
                  style={{ background: r.risk === risk ? (risk === "high" ? "#ef4444" : risk === "medium" ? "#fbbf24" : "#4ade80") : "var(--surface)", color: r.risk === risk ? "#000" : "var(--text-muted)", border: "1px solid var(--border)" }}>
                  {risk}
                </button>
              ))}
            </div>
            <DeleteBtn onClick={() => { reqs.splice(ri, 1); rebuild(); }} />
          </div>
        ))}
        <AddButton onClick={() => { reqs.push({ name: "Req" + (reqs.length + 1), id: "REQ-" + (reqs.length + 1), text: "Description", risk: "low" }); rebuild(); }}>+ Add Requirement</AddButton>
      </div>
    );
  }

  // ─── Block Diagram ───
  if (code.startsWith("block")) {
    const blocks: { id: string; label: string }[] = [];
    const connections: { from: string; to: string; label: string }[] = [];
    code.split("\n").forEach(line => {
      const t = line.trim();
      const blockMatch = t.match(/^(\w+)(?:\["([^"]+)"\]|\("([^"]+)"\))?$/);
      if (blockMatch && !["block-beta", "columns"].includes(blockMatch[1])) {
        blocks.push({ id: blockMatch[1], label: blockMatch[2] || blockMatch[3] || blockMatch[1] });
      }
      const connMatch = t.match(/(\w+)\s*-->\s*(\w+)(?:\s*:\s*"?([^"]*)"?)?/);
      if (connMatch) connections.push({ from: connMatch[1], to: connMatch[2], label: connMatch[3] || "" });
    });

    const rebuild = () => {
      let c = "block-beta\n    columns 3\n";
      blocks.forEach(b => { c += `    ${b.id}["${b.label}"]\n`; });
      connections.forEach(cn => { c += `    ${cn.from} --> ${cn.to}${cn.label ? ` : "${cn.label}"` : ""}\n`; });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>Block Diagram — Blocks ({blocks.length})</SectionTitle>
        {blocks.map((b, i) => (
          <div key={i} className="flex gap-2 items-center p-2" style={{ ...cardCSS, borderLeft: `4px solid ${PIE_COLORS[i % PIE_COLORS.length]}` }}>
            <input value={b.id} onChange={(e) => { blocks[i].id = e.target.value; rebuild(); }}
              className="w-20 text-xs font-mono bg-transparent outline-none font-bold" style={{ color: "var(--accent)" }} placeholder="id" />
            <input value={b.label} onChange={(e) => { blocks[i].label = e.target.value; rebuild(); }}
              className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-primary)" }} placeholder="Label" />
            <DeleteBtn onClick={() => { blocks.splice(i, 1); rebuild(); }} />
          </div>
        ))}
        <AddButton onClick={() => { blocks.push({ id: `b${blocks.length + 1}`, label: "Block" }); rebuild(); }}>+ Add Block</AddButton>
        <SectionTitle>Connections ({connections.length})</SectionTitle>
        {connections.map((cn, i) => (
          <div key={i} className="flex gap-2 items-center p-2" style={cardCSS}>
            <select value={cn.from} onChange={(e) => { connections[i].from = e.target.value; rebuild(); }}
              className={`w-24 ${inputStyle} text-xs`} style={inputCSS}>
              {blocks.map(b => <option key={b.id} value={b.id}>{b.id}</option>)}
            </select>
            <span style={{ color: "var(--accent)" }}>→</span>
            <select value={cn.to} onChange={(e) => { connections[i].to = e.target.value; rebuild(); }}
              className={`w-24 ${inputStyle} text-xs`} style={inputCSS}>
              {blocks.map(b => <option key={b.id} value={b.id}>{b.id}</option>)}
            </select>
            <input value={cn.label} onChange={(e) => { connections[i].label = e.target.value; rebuild(); }}
              className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-primary)" }} placeholder="label" />
            <DeleteBtn onClick={() => { connections.splice(i, 1); rebuild(); }} />
          </div>
        ))}
        <AddButton onClick={() => { connections.push({ from: blocks[0]?.id || "a", to: blocks[1]?.id || "b", label: "" }); rebuild(); }}>+ Add Connection</AddButton>
      </div>
    );
  }

  // ─── Packet Diagram ───
  if (code.startsWith("packet")) {
    const fields: { start: number; end: number; label: string }[] = [];
    code.split("\n").forEach(line => {
      const m = line.match(/(\d+)-(\d+)\s*:\s*"([^"]+)"/);
      if (m) fields.push({ start: parseInt(m[1]), end: parseInt(m[2]), label: m[3] });
    });
    if (fields.length === 0) fields.push({ start: 0, end: 15, label: "Header" });

    const rebuild = () => {
      let c = "packet-beta\n";
      fields.forEach(f => { c += `    ${f.start}-${f.end} : "${f.label}"\n`; });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>Packet Diagram — Fields ({fields.length})</SectionTitle>
        {fields.map((f, i) => (
          <div key={i} className="flex gap-2 items-center p-2" style={{ ...cardCSS, borderLeft: `4px solid ${PIE_COLORS[i % PIE_COLORS.length]}` }}>
            <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>bits:</span>
            <input type="number" value={f.start} onChange={(e) => { fields[i].start = parseInt(e.target.value) || 0; rebuild(); }}
              className="w-12 text-xs font-mono rounded px-1 py-0.5 outline-none text-center" style={inputCSS} />
            <span style={{ color: "var(--text-faint)" }}>—</span>
            <input type="number" value={f.end} onChange={(e) => { fields[i].end = parseInt(e.target.value) || 0; rebuild(); }}
              className="w-12 text-xs font-mono rounded px-1 py-0.5 outline-none text-center" style={inputCSS} />
            <input value={f.label} onChange={(e) => { fields[i].label = e.target.value; rebuild(); }}
              className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-primary)" }} placeholder="Field name" />
            <DeleteBtn onClick={() => { fields.splice(i, 1); rebuild(); }} />
          </div>
        ))}
        <AddButton onClick={() => {
          const last = fields[fields.length - 1];
          const start = last ? last.end + 1 : 0;
          fields.push({ start, end: start + 7, label: "Field" }); rebuild();
        }}>+ Add Field</AddButton>
      </div>
    );
  }

  // ─── Architecture ───
  if (code.startsWith("architecture")) {
    const services: { id: string; label: string; icon: string; group: string }[] = [];
    const connections: { from: string; to: string; direction: string }[] = [];
    code.split("\n").forEach(line => {
      const t = line.trim();
      const svcMatch = t.match(/service\s+(\w+)\(([^)]*)\)/);
      if (svcMatch) {
        const inner = svcMatch[2];
        const icon = inner.match(/\[([^\]]+)\]/)?.[1] || "";
        const label = inner.replace(/\[[^\]]+\]/, "").trim();
        services.push({ id: svcMatch[1], label, icon, group: "" });
      }
      const connMatch = t.match(/(\w+)\s*(<--|-->|<-->)\s*(\w+)/);
      if (connMatch) connections.push({ from: connMatch[1], direction: connMatch[2], to: connMatch[3] });
    });

    const rebuild = () => {
      let c = "architecture-beta\n";
      services.forEach(s => { c += `    service ${s.id}(${s.icon ? `[${s.icon}]` : ""} ${s.label})\n`; });
      connections.forEach(cn => { c += `    ${cn.from} ${cn.direction} ${cn.to}\n`; });
      onChange(c.trim());
    };

    return (
      <div className="p-5 space-y-4 overflow-auto">
        <SectionTitle>Architecture — Services ({services.length})</SectionTitle>
        {services.map((s, i) => (
          <div key={i} className="flex gap-2 items-center p-2" style={{ ...cardCSS, borderLeft: `4px solid ${PIE_COLORS[i % PIE_COLORS.length]}` }}>
            <input value={s.id} onChange={(e) => { services[i].id = e.target.value; rebuild(); }}
              className="w-20 text-xs font-mono bg-transparent outline-none font-bold" style={{ color: "var(--accent)" }} placeholder="id" />
            <input value={s.label} onChange={(e) => { services[i].label = e.target.value; rebuild(); }}
              className="flex-1 text-xs bg-transparent outline-none" style={{ color: "var(--text-primary)" }} placeholder="Label" />
            <input value={s.icon} onChange={(e) => { services[i].icon = e.target.value; rebuild(); }}
              className="w-16 text-xs font-mono bg-transparent outline-none" style={{ color: "var(--text-muted)" }} placeholder="icon" />
            <DeleteBtn onClick={() => { services.splice(i, 1); rebuild(); }} />
          </div>
        ))}
        <AddButton onClick={() => { services.push({ id: `svc${services.length + 1}`, label: "Service", icon: "server", group: "" }); rebuild(); }}>+ Add Service</AddButton>
        <SectionTitle>Connections ({connections.length})</SectionTitle>
        {connections.map((cn, i) => (
          <div key={i} className="flex gap-2 items-center p-2" style={cardCSS}>
            <select value={cn.from} onChange={(e) => { connections[i].from = e.target.value; rebuild(); }}
              className={`w-24 ${inputStyle} text-xs`} style={inputCSS}>
              {services.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
            </select>
            <select value={cn.direction} onChange={(e) => { connections[i].direction = e.target.value; rebuild(); }}
              className="w-14 text-xs font-mono text-center rounded px-1 py-1 outline-none" style={{ ...inputCSS, color: "var(--accent)" }}>
              {["-->", "<--", "<-->"].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={cn.to} onChange={(e) => { connections[i].to = e.target.value; rebuild(); }}
              className={`w-24 ${inputStyle} text-xs`} style={inputCSS}>
              {services.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
            </select>
            <DeleteBtn onClick={() => { connections.splice(i, 1); rebuild(); }} />
          </div>
        ))}
        <AddButton onClick={() => { connections.push({ from: services[0]?.id || "a", direction: "-->", to: services[1]?.id || "b" }); rebuild(); }}>+ Add Connection</AddButton>
      </div>
    );
  }

  // Fallback: raw code for any unknown type
  return (
    <div className="flex flex-col flex-1">
      <div className="p-5">
        <SectionTitle>Mermaid Code</SectionTitle>
        <p className="text-[11px] mb-3" style={{ color: "var(--text-faint)" }}>
          Edit the Mermaid code directly. Changes are reflected in the preview.
        </p>
      </div>
      <textarea value={code} onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-5 pb-5 bg-transparent font-mono text-[13px] resize-none outline-none leading-relaxed"
        style={{ color: "var(--editor-text)" }} spellCheck={false} />
    </div>
  );
}

export default function MdCanvas({
  onGenerate,
  onCancel,
  initialMermaid,
}: {
  onGenerate: (md: string) => void;
  onCancel?: () => void;
  initialMermaid?: string;
}) {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [direction, setDirection] = useState<Direction>("LR");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [connectState, setConnectState] = useState<ConnectState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingEdge, setEditingEdge] = useState<number | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const justSelectedRef = useRef(false);
  const [showImport, setShowImport] = useState(false);
  const [rawCodeMode, setRawCodeMode] = useState(false);
  const [rawCode, setRawCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const [showCode, setShowCode] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);

  // Live Mermaid code preview
  const liveCode = useMemo(
    () => (nodes.length > 0 ? canvasToMermaid(nodes, edges, direction) : ""),
    [nodes, edges, direction]
  );

  // Render live Mermaid preview
  useEffect(() => {
    const codeToRender = rawCodeMode ? rawCode : liveCode;
    if (!previewPanelRef.current || !codeToRender || !showCode) return;
    const container = previewPanelRef.current.querySelector(".mermaid-preview-render");
    if (!container) return;

    import("mermaid").then(async (mermaidModule) => {
      const mermaid = mermaidModule.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "dark",
        themeVariables: {
          primaryColor: "#fb923c",
          primaryTextColor: "#fafafa",
          primaryBorderColor: "#ea580c",
          lineColor: "#71717a",
          secondaryColor: "#27272a",
          tertiaryColor: "#18181b",
          background: "#09090b",
          mainBkg: "#27272a",
          nodeBorder: "#3f3f46",
          clusterBkg: "#18181b",
          titleColor: "#fafafa",
          edgeLabelBackground: "#18181b",
          pie1: "#fb923c",
          pie2: "#60a5fa",
          pie3: "#4ade80",
          pie4: "#c4b5fd",
          pie5: "#f472b6",
        },
        fontFamily: "ui-monospace, monospace",
        fontSize: 13,
      });

      try {
        const id = `mermaid-preview-${Date.now()}`;
        const { svg } = await mermaid.render(id, codeToRender);
        container.innerHTML = svg;
      } catch {
        container.innerHTML = `<span style="color:var(--text-faint);font-size:11px">Invalid diagram</span>`;
      }
    });
  }, [liveCode, rawCode, rawCodeMode, showCode]);

  // Load initial mermaid code
  useEffect(() => {
    if (initialMermaid) {
      const result = mermaidToCanvas(initialMermaid);
      if (result && result.nodes.length > 0) {
        setNodes(result.nodes);
        setEdges(result.edges);
        setDirection(result.direction === "TD" || result.direction === "TB" ? "TD" : "LR");
        nextId = result.nodes.length + 1;
        setRawCodeMode(false);
      } else {
        // Can't parse as flowchart (sequence, pie, etc) → raw code edit mode
        setRawCodeMode(true);
        setRawCode(initialMermaid);
        setNodes([]);
        setEdges([]);
      }
    } else {
      setNodes([]);
      setEdges([]);
      setRawCodeMode(false);
      setRawCode("");
      nextId = 1;
    }
    setSelectedId(null);
    setEditingId(null);
    setEditingEdge(null);
  }, [initialMermaid]);

  // Add node on double-click canvas
  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest(".canvas-node")) return;
      if ((e.target as HTMLElement).closest(".edge-label")) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const id = genId();
      const newNode: CanvasNode = {
        id,
        x: e.clientX - rect.left - 60,
        y: e.clientY - rect.top - 18,
        text: "",
        shape: "round",
      };
      setNodes((prev) => [...prev, newNode]);
      setEditingId(id);
      setSelectedId(id);
    },
    []
  );

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if ((e.target as HTMLElement).closest("button")) return;
      e.stopPropagation();
      setSelectedId(nodeId);

      if (e.altKey) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        setConnectState({
          fromId: nodeId,
          mouseX: e.clientX - rect.left,
          mouseY: e.clientY - rect.top,
        });
        return;
      }

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      setDragState({
        nodeId,
        offsetX: e.clientX - rect.left - node.x,
        offsetY: e.clientY - rect.top - node.y,
      });
    },
    [nodes]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (dragState) {
        const x = e.clientX - rect.left - dragState.offsetX;
        const y = e.clientY - rect.top - dragState.offsetY;
        setNodes((prev) =>
          prev.map((n) =>
            n.id === dragState.nodeId ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n
          )
        );
      }

      if (connectState) {
        setConnectState((prev) =>
          prev ? { ...prev, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top } : null
        );
      }
    },
    [dragState, connectState]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (connectState) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const target = nodes.find(
            (n) =>
              n.id !== connectState.fromId &&
              mx >= n.x - 10 &&
              mx <= n.x + 150 &&
              my >= n.y - 10 &&
              my <= n.y + 50
          );
          if (target) {
            const exists = edges.some(
              (ed) => ed.from === connectState.fromId && ed.to === target.id
            );
            if (!exists) {
              setEdges((prev) => [...prev, { from: connectState.fromId, to: target.id }]);
            }
          }
        }
        setConnectState(null);
      }
      setDragState(null);
    },
    [connectState, nodes, edges]
  );

  const handleTextChange = useCallback((nodeId: string, text: string) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, text } : n)));
  }, []);

  const cycleShape = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const shapes: CanvasNode["shape"][] = ["round", "square", "circle", "diamond"];
        const idx = shapes.indexOf(n.shape);
        return { ...n, shape: shapes[(idx + 1) % shapes.length] };
      })
    );
  }, []);

  const deleteSelected = useCallback(() => {
    // Delete multi-selected nodes
    if (selectedIds.size > 0) {
      setNodes((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setEdges((prev) => prev.filter((e) => !selectedIds.has(e.from) && !selectedIds.has(e.to)));
      setSelectedIds(new Set());
      return;
    }
    // Delete single selected node
    if (!selectedId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedId));
    setEdges((prev) => prev.filter((e) => e.from !== selectedId && e.to !== selectedId));
    setSelectedId(null);
    setEditingId(null);
  }, [selectedId, selectedIds]);

  const duplicateSelected = useCallback(() => {
    if (!selectedId) return;
    const node = nodes.find((n) => n.id === selectedId);
    if (!node) return;
    const newId = genId();
    setNodes((prev) => [...prev, { ...node, id: newId, x: node.x + 30, y: node.y + 30 }]);
    setSelectedId(newId);
  }, [selectedId, nodes]);

  const deleteEdge = useCallback((index: number) => {
    setEdges((prev) => prev.filter((_, i) => i !== index));
    setEditingEdge(null);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (editingId || editingEdge !== null) return;
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, duplicateSelected, editingId, editingEdge]);

  const handleGenerate = useCallback(() => {
    if (rawCodeMode) {
      const md = wrapInCodeBlock(rawCode);
      onGenerate(md);
    } else {
      const mermaidCode = canvasToMermaid(nodes, edges, direction);
      const md = wrapInCodeBlock(mermaidCode);
      onGenerate(md);
    }
  }, [nodes, edges, direction, onGenerate, rawCodeMode, rawCode]);

  const handleImport = useCallback(() => {
    // Strip code fences if present
    let code = importCode.trim();
    code = code.replace(/^```mermaid\n?/, "").replace(/\n?```$/, "");

    const result = mermaidToCanvas(code);
    if (result) {
      setNodes(result.nodes);
      setEdges(result.edges);
      setDirection(result.direction === "TD" || result.direction === "TB" ? "TD" : "LR");
      nextId = result.nodes.length + 1;
      setShowImport(false);
      setImportCode("");
    }
  }, [importCode]);

  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + 70, y: node.y + 20 };
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-3 sm:px-4 py-2 text-xs flex-wrap gap-2"
        style={{ borderBottom: "1px solid var(--border-dim)" }}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Mermaid
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold"
            style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
            {rawCodeMode
              ? rawCode.startsWith("sequenceDiagram") ? "Sequence"
              : rawCode.startsWith("pie") ? "Pie"
              : rawCode.startsWith("gantt") ? "Gantt"
              : rawCode.startsWith("erDiagram") ? "ER"
              : rawCode.startsWith("mindmap") ? "Mindmap"
              : rawCode.startsWith("timeline") ? "Timeline"
              : rawCode.startsWith("journey") ? "Journey"
              : rawCode.startsWith("quadrantChart") ? "Quadrant"
              : rawCode.startsWith("xychart") ? "XY Chart"
              : rawCode.startsWith("kanban") ? "Kanban"
              : rawCode.startsWith("classDiagram") ? "Class"
              : rawCode.startsWith("stateDiagram") ? "State"
              : rawCode.startsWith("gitGraph") ? "Git"
              : rawCode.startsWith("sankey") ? "Sankey"
              : rawCode.startsWith("block") ? "Block"
              : rawCode.startsWith("architecture") ? "Architecture"
              : rawCode.startsWith("requirementDiagram") ? "Requirement"
              : "Diagram"
              : "Flowchart"}
          </span>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="px-2 py-1 rounded-md font-mono text-[11px]"
            style={{
              background: showGuide ? "var(--accent-dim)" : "var(--toggle-bg)",
              color: showGuide ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            Help
          </button>
          {!rawCodeMode && (
            <div className="flex rounded-md overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {(["LR", "TD"] as Direction[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className="px-2 py-0.5 text-[10px] font-mono"
                  style={{
                    background: direction === d ? "var(--accent-dim)" : "transparent",
                    color: direction === d ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {d === "LR" ? "→" : "↓"}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCode(!showCode)}
            className="px-2 py-1 rounded-md font-mono text-[11px]"
            style={{
              background: showCode ? "var(--accent-dim)" : "var(--toggle-bg)",
              color: showCode ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            Code
          </button>
          {nodes.length > 0 && (
            <button
              onClick={() => { setNodes([]); setEdges([]); setSelectedId(null); nextId = 1; }}
              className="px-2 py-1 rounded-md font-mono text-[11px]"
              style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}
            >
              Clear
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1 rounded-md font-mono text-[11px]"
              style={{ background: "var(--toggle-bg)", color: "var(--text-muted)" }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={nodes.length === 0 && !rawCodeMode}
            className="px-3 py-1 rounded-md font-mono text-[11px] font-semibold"
            style={{
              background: (nodes.length > 0 || rawCodeMode) ? "var(--accent)" : "var(--toggle-bg)",
              color: (nodes.length > 0 || rawCodeMode) ? "#000" : "var(--text-muted)",
            }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Import panel */}
      {showImport && (
        <div
          className="px-4 py-3 flex gap-2"
          style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--surface)" }}
        >
          <textarea
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
            placeholder="Paste Mermaid code here (graph LR; A --> B)"
            className="flex-1 bg-transparent text-xs font-mono outline-none resize-none"
            style={{ color: "var(--text-primary)", minHeight: 48 }}
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={handleImport}
              className="px-3 py-1 rounded text-[11px] font-mono"
              style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
            >
              Load
            </button>
            <button
              onClick={() => { setShowImport(false); setImportCode(""); }}
              className="px-3 py-1 rounded text-[11px] font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Guide panel */}
      {showGuide && !rawCodeMode && (
        <div
          className="px-4 py-3 text-xs overflow-auto"
          style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--surface)", maxHeight: 200 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ color: "var(--text-tertiary)" }}>
            <div>
              <p className="font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Create</p>
              <p><span style={{ color: "var(--accent)" }}>Double-click</span> canvas to add a node</p>
              <p><span style={{ color: "var(--accent)" }}>Click shape button</span> ()/[]/(()/{"{}"}{")"} to change shape</p>
              <p><span style={{ color: "var(--accent)" }}>Double-click node</span> to edit text</p>
            </div>
            <div>
              <p className="font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Connect</p>
              <p><span style={{ color: "var(--accent)" }}>Alt + drag</span> from one node to another</p>
              <p><span style={{ color: "var(--accent)" }}>Double-click edge</span> to add a label</p>
              <p><span style={{ color: "var(--accent)" }}>Delete/Backspace</span> to remove selected</p>
              <p><span style={{ color: "var(--accent)" }}>Cmd+D</span> to duplicate selected</p>
            </div>
            <div>
              <p className="font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Shapes → Mermaid</p>
              <p><span style={{ color: "var(--accent)" }}>()</span> Round = default node</p>
              <p><span style={{ color: "var(--accent)" }}>[]</span> Square = process/action</p>
              <p><span style={{ color: "var(--accent)" }}>(())</span> Circle = start/end</p>
              <p><span style={{ color: "var(--accent)" }}>{"{}"}</span> Diamond = decision/condition</p>
            </div>
          </div>
        </div>
      )}

      {/* Main area: canvas + code panel */}
      <div className="flex flex-1 min-h-0">

      {/* Raw code mode for non-flowchart diagrams (sequence, pie, etc) */}
      {rawCodeMode ? (
        <div className="flex-1 flex flex-col overflow-auto">
          <DiagramFormEditor code={rawCode} onChange={setRawCode} />
        </div>
      ) : (
      /* Canvas */
      <div
        ref={canvasRef}
        className={`${showCode && nodes.length > 0 ? "w-2/3" : "w-full"} relative overflow-auto cursor-crosshair select-none`}
        onDoubleClick={handleCanvasDoubleClick}
        onMouseDown={(e) => {
          // Start selection box if clicking on empty canvas
          if ((e.target as HTMLElement).closest(".canvas-node") || (e.target as HTMLElement).closest(".edge-label")) return;
          if (e.button !== 0) return;
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
        }}
        onMouseMove={(e) => {
          handleMouseMove(e);
          // Update selection box
          if (selectionBox && !dragState && !connectState) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            setSelectionBox((prev) => prev ? { ...prev, endX: e.clientX - rect.left, endY: e.clientY - rect.top } : null);
          }
        }}
        onMouseUp={(e) => {
          handleMouseUp(e);
          // Finish selection box
          if (selectionBox) {
            const minX = Math.min(selectionBox.startX, selectionBox.endX);
            const maxX = Math.max(selectionBox.startX, selectionBox.endX);
            const minY = Math.min(selectionBox.startY, selectionBox.endY);
            const maxY = Math.max(selectionBox.startY, selectionBox.endY);
            // Only select if box is bigger than 10px (not just a click)
            if (maxX - minX > 10 && maxY - minY > 10) {
              const selected = new Set<string>();
              nodes.forEach((n) => {
                const cx = n.x + 60;
                const cy = n.y + 20;
                if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
                  selected.add(n.id);
                }
              });
              setSelectedIds(selected);
              if (selected.size > 0) {
                setSelectedId(null);
                justSelectedRef.current = true;
                setTimeout(() => { justSelectedRef.current = false; }, 100);
              }
            }
            setSelectionBox(null);
          }
        }}
        onClick={(e) => {
          if (justSelectedRef.current) return; // skip click after drag selection
          if (!(e.target as HTMLElement).closest(".canvas-node") && !(e.target as HTMLElement).closest(".edge-label")) {
            setSelectedId(null);
            setSelectedIds(new Set());
            setEditingId(null);
            setEditingEdge(null);
          }
        }}
      >
        {/* Grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, var(--border-dim) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Edges SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <defs>
            <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--text-faint)" />
            </marker>
            <marker id="arr-start" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto-start-reverse">
              <polygon points="0 0, 8 3, 0 6" fill="var(--text-faint)" />
            </marker>
            <marker id="arr-accent" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--accent)" />
            </marker>
          </defs>

          {edges.map((edge, i) => {
            const from = getNodeCenter(edge.from);
            const to = getNodeCenter(edge.to);
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;

            // Curved path with control point offset
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const isHorizontalish = Math.abs(dx) > Math.abs(dy);
            const cx1 = isHorizontalish ? from.x + dx * 0.5 : from.x;
            const cy1 = isHorizontalish ? from.y : from.y + dy * 0.5;
            const cx2 = isHorizontalish ? to.x - dx * 0.5 : to.x;
            const cy2 = isHorizontalish ? to.y : to.y - dy * 0.5;
            const pathD = `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;

            return (
              <g key={i}>
                <path
                  d={pathD}
                  stroke="var(--text-faint)"
                  strokeWidth={edge.style === "thick" ? 3 : 1.5}
                  strokeDasharray={edge.style === "dotted" ? "6 4" : undefined}
                  fill="none"
                  markerEnd={edge.direction === "none" ? undefined : "url(#arr)"}
                  markerStart={edge.direction === "both" ? "url(#arr-start)" : undefined}
                />
                {/* Clickable hit area */}
                <path
                  d={pathD}
                  stroke="transparent" strokeWidth={14}
                  fill="none"
                  style={{ pointerEvents: "all", cursor: "pointer" }}
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingEdge(i); }}
                />
                {/* Edge label */}
                {edge.label && (
                  <g>
                    <rect
                      x={midX - edge.label.length * 3.5 - 6}
                      y={midY - 18}
                      width={edge.label.length * 7 + 12}
                      height={20}
                      rx={4}
                      fill="var(--surface)"
                      stroke="var(--border)"
                      strokeWidth={0.5}
                    />
                    <text
                      x={midX} y={midY - 5}
                      textAnchor="middle"
                      fill="var(--text-muted)"
                      fontSize={11}
                      fontFamily="var(--font-geist-mono), monospace"
                    >
                      {edge.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {connectState && (
            <line
              x1={getNodeCenter(connectState.fromId).x}
              y1={getNodeCenter(connectState.fromId).y}
              x2={connectState.mouseX} y2={connectState.mouseY}
              stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="6 3"
              markerEnd="url(#arr-accent)"
            />
          )}
        </svg>

        {/* Edge editor (label + style) */}
        {editingEdge !== null && edges[editingEdge] && (() => {
          const edge = edges[editingEdge];
          const from = getNodeCenter(edge.from);
          const to = getNodeCenter(edge.to);
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <div
              className="edge-label absolute z-20 flex flex-col gap-1.5"
              style={{ left: midX - 100, top: midY - 22, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
            >
              <div className="flex gap-1 items-center">
                <input
                  autoFocus
                  value={edge.label || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEdges((prev) => prev.map((ed, idx) => idx === editingEdge ? { ...ed, label: val } : ed));
                  }}
                  onBlur={() => setEditingEdge(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") setEditingEdge(null);
                  }}
                  placeholder="label"
                  className="px-2 py-1.5 text-[11px] font-mono rounded outline-none w-28"
                  style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
                <button
                  onMouseDown={(e) => { e.preventDefault(); deleteEdge(editingEdge); }}
                  className="px-1.5 py-1.5 rounded text-[11px] font-bold"
                  style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}
                >
                  ×
                </button>
              </div>
              {/* Style + Direction row */}
              <div className="flex gap-1">
                <span className="text-[9px] py-1" style={{ color: "var(--text-faint)" }}>Line:</span>
                {(["solid", "dotted", "thick"] as const).map((s) => (
                  <button
                    key={s}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setEdges((prev) => prev.map((ed, idx) => idx === editingEdge ? { ...ed, style: s } : ed));
                    }}
                    className="px-2 py-1 rounded text-[11px]"
                    style={{
                      background: (edge.style || "solid") === s ? "var(--accent)" : "var(--background)",
                      color: (edge.style || "solid") === s ? "#000" : "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {s === "solid" ? "━" : s === "dotted" ? "┄" : "┃"}
                  </button>
                ))}
                <span className="text-[9px] py-1 ml-1" style={{ color: "var(--text-faint)" }}>Dir:</span>
                {(["forward", "both", "none"] as const).map((d) => (
                  <button
                    key={d}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setEdges((prev) => prev.map((ed, idx) => idx === editingEdge ? { ...ed, direction: d } : ed));
                    }}
                    className="px-2 py-1 rounded text-[11px]"
                    style={{
                      background: (edge.direction || "forward") === d ? "var(--accent)" : "var(--background)",
                      color: (edge.direction || "forward") === d ? "#000" : "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {d === "forward" ? "→" : d === "both" ? "⇄" : "―"}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Nodes */}
        {nodes.map((node) => {
          const isSelected = selectedId === node.id || selectedIds.has(node.id);
          return (
          <div
            key={node.id}
            className="canvas-node absolute group"
            style={{ left: node.x, top: node.y, zIndex: isSelected ? 10 : 2, minWidth: 120 }}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            onDoubleClick={(e) => { e.stopPropagation(); setEditingId(node.id); }}
          >
            {/* Shape toggle — outside node, top-right */}
            <button
              onClick={(e) => { e.stopPropagation(); cycleShape(node.id); }}
              className="absolute opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full z-10"
              style={{ top: -10, right: -10, background: "var(--surface)", border: "1px solid var(--border)" }}
              title="Click to change shape"
            >
              <ShapeIcon shape={node.shape} size={12} />
            </button>
            <div
              className="px-3 py-2 text-sm transition-colors"
              style={{
                background: "var(--surface)",
                border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                boxShadow: isSelected
                  ? "0 0 0 2px var(--accent-dim), 0 4px 12px rgba(0,0,0,0.3)"
                  : "0 2px 8px rgba(0,0,0,0.2)",
                ...shapeCSS[node.shape],
              }}
            >
              {/* Diamond: counter-rotate content */}
              <div style={node.shape === "diamond" ? { transform: "rotate(-45deg)" } : {}}>
                {editingId === node.id ? (
                  <input
                    autoFocus
                    value={node.text}
                    onChange={(e) => handleTextChange(node.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") setEditingId(null);
                      e.stopPropagation();
                    }}
                    className="w-full bg-transparent outline-none text-xs"
                    style={{ color: "var(--text-primary)", minWidth: 80 }}
                  />
                ) : (
                  <div
                    className="text-xs min-h-[20px] whitespace-nowrap"
                    style={{ color: node.text ? "var(--text-secondary)" : "var(--text-faint)" }}
                  >
                    {node.text || "..."}
                  </div>
                )}
              </div>{/* end diamond rotate wrapper */}
            </div>
          </div>
          );
        })}

        {/* Empty state */}
        {/* Selection box */}
        {selectionBox && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: Math.min(selectionBox.startX, selectionBox.endX),
              top: Math.min(selectionBox.startY, selectionBox.endY),
              width: Math.abs(selectionBox.endX - selectionBox.startX),
              height: Math.abs(selectionBox.endY - selectionBox.startY),
              border: "1px dashed var(--accent)",
              background: "var(--accent-dim)",
              borderRadius: 4,
              zIndex: 20,
            }}
          />
        )}

        {nodes.length === 0 && !showImport && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
            <div className="text-4xl opacity-20">🔀</div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Double-click anywhere to add a node
            </p>
            <div className="text-xs space-y-1 text-center" style={{ color: "var(--text-faint)" }}>
              <p>Alt + drag between nodes to connect them</p>
              <p>Click <span style={{ color: "var(--accent)" }}>?</span> for the full guide</p>
            </div>
          </div>
        )}
      </div>
      )}{/* end rawCodeMode conditional */}

      {/* Code + Preview panel */}
      {showCode && (nodes.length > 0 || rawCodeMode) && (
        <div
          className="w-1/3 flex flex-col"
          style={{ borderLeft: "1px solid var(--border-dim)" }}
        >
          {/* Code */}
          <div className="flex flex-col h-1/2" style={{ borderBottom: "1px solid var(--border-dim)" }}>
            <div
              className="flex items-center justify-between px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider shrink-0"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}
            >
              <span>Code</span>
              <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>editable</span>
            </div>
            <textarea
              className="flex-1 p-3 overflow-auto text-xs font-mono leading-relaxed resize-none outline-none"
              style={{ color: "var(--text-secondary)", background: "var(--surface)", margin: 0, border: "none" }}
              value={rawCodeMode ? rawCode : liveCode}
              onChange={(e) => {
                const newCode = e.target.value;
                if (rawCodeMode) {
                  setRawCode(newCode);
                } else {
                  // Parse edited code back into canvas nodes
                  const result = mermaidToCanvas(newCode);
                  if (result && result.nodes.length > 0) {
                    setNodes(result.nodes);
                    setEdges(result.edges);
                    setDirection(result.direction === "TD" || result.direction === "TB" ? "TD" : "LR");
                    nextId = result.nodes.length + 1;
                  }
                }
              }}
              spellCheck={false}
            />
          </div>

          {/* Rendered Preview */}
          <div className="flex flex-col h-1/2">
            <div
              className="flex items-center px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider shrink-0"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-dim)" }}
            >
              <span>Preview</span>
            </div>
            <div className="flex-1 overflow-auto p-3 flex items-center justify-center" ref={previewPanelRef}>
              {(rawCodeMode ? rawCode : liveCode) ? (
                <div className="mermaid-preview-render" style={{ textAlign: "center", width: "100%" }} />
              ) : (
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>Add nodes to see preview</span>
              )}
            </div>
          </div>
        </div>
      )}

      </div>{/* end main area */}
    </div>
  );
}
