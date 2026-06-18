// ============================================================
// A.G.O. — Full Shield Dashboard | src/App.jsx
// Real-time control center — jet black + neon aesthetics
// ============================================================

import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#000000",
  card: "#0A0A0A",
  border: "#1a1a1a",
  green: "#39FF14",
  pink: "#FF1493",
  gold: "#FFD700",
  orange: "#FF6B00",
  white: "#F1F1F1",
  muted: "#666",
};

// Mock SSE endpoint — replace with real /api/stream
function useAGOStream() {
  const [stats, setStats] = useState({
    gapsDetected: 0,
    assetsForged: 0,
    distributed: 0,
    citationsMapped: 0,
    lastCycle: null,
    recentGaps: [],
    recentAssets: [],
  });

  useEffect(() => {
    // Simulate live data — replace with EventSource("/api/stream")
    const interval = setInterval(() => {
      setStats((prev) => ({
        gapsDetected: prev.gapsDetected + Math.floor(Math.random() * 3),
        assetsForged: prev.assetsForged + Math.floor(Math.random() * 2),
        distributed: prev.distributed + Math.floor(Math.random() * 4),
        citationsMapped: prev.citationsMapped + Math.floor(Math.random() * 1),
        lastCycle: new Date().toISOString(),
        recentGaps: [
          {
            id: Math.random().toString(36).slice(2, 8),
            query: sampleQueries[Math.floor(Math.random() * sampleQueries.length)],
            source: ["serp", "reddit", "discord"][Math.floor(Math.random() * 3)],
            score: (Math.random() * 0.65 + 0.35).toFixed(2),
            ts: new Date().toLocaleTimeString(),
          },
          ...prev.recentGaps.slice(0, 7),
        ],
        recentAssets: [
          {
            id: Math.random().toString(36).slice(2, 8),
            type: ["code_snippet", "technical_explainer", "faq_block", "comparison"][Math.floor(Math.random() * 4)],
            title: sampleTitles[Math.floor(Math.random() * sampleTitles.length)],
            ts: new Date().toLocaleTimeString(),
          },
          ...prev.recentAssets.slice(0, 7),
        ],
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return stats;
}

const sampleQueries = [
  "x402 payment rails AI agents",
  "HTTP 402 micropayments setup",
  "XRPL RLUSD payment gateway",
  "ghost layer ephemeral agent",
  "Pine Script v6 squeeze indicator",
  "MCP server payment gating",
  "autonomous agent marketplace",
];

const sampleTitles = [
  "How to implement x402 on XRPL",
  "SqueezeOS vs. TradingView Premium",
  "ghost-layer Ed25519 residue explained",
  "NEXUS-402 agent marketplace FAQ",
  "CRAWLTOLL x402 signal feed setup",
];

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${color}33`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 4,
      padding: "16px 20px",
      minWidth: 140,
    }}>
      <div style={{ color: COLORS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{label}</div>
      <div style={{ color, fontSize: 32, fontFamily: "monospace", fontWeight: 700 }}>{value.toLocaleString()}</div>
    </div>
  );
}

function PulseDot({ active }) {
  return (
    <span style={{
      display: "inline-block",
      width: 8, height: 8,
      borderRadius: "50%",
      background: active ? COLORS.green : COLORS.muted,
      boxShadow: active ? `0 0 8px ${COLORS.green}` : "none",
      marginRight: 8,
      animation: active ? "pulse 1.5s infinite" : "none",
    }} />
  );
}

function FeedRow({ item, type }) {
  const sourceColor = { serp: COLORS.gold, reddit: COLORS.orange, discord: COLORS.pink, code_snippet: COLORS.green, technical_explainer: COLORS.gold, faq_block: COLORS.orange, comparison: COLORS.pink }[item.source || item.type] || COLORS.white;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "8px 12px",
      borderBottom: `1px solid ${COLORS.border}`,
      fontSize: 12,
    }}>
      <span style={{ color: sourceColor, fontFamily: "monospace", minWidth: 90, textTransform: "uppercase" }}>
        {item.source || item.type}
      </span>
      <span style={{ color: COLORS.white, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {type === "gap" ? item.query : item.title}
      </span>
      {item.score && <span style={{ color: COLORS.green, fontFamily: "monospace", fontSize: 11 }}>{item.score}</span>}
      <span style={{ color: COLORS.muted, fontFamily: "monospace", fontSize: 10 }}>{item.ts}</span>
    </div>
  );
}

export default function AGODashboard() {
  const stats = useAGOStream();
  const [tab, setTab] = useState("gaps");

  return (
    <div style={{
      background: COLORS.bg,
      minHeight: "100vh",
      color: COLORS.white,
      fontFamily: "'Fira Code', 'Courier New', monospace",
      padding: 24,
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0A0A0A; }
        ::-webkit-scrollbar-thumb { background: #333; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PulseDot active />
            <span style={{ color: COLORS.green, fontSize: 18, fontWeight: 700, letterSpacing: 3 }}>A.G.O.</span>
            <span style={{ color: COLORS.muted, fontSize: 12 }}>AUTONOMOUS GROUND-TRUTH ORCHESTRATOR</span>
          </div>
          <div style={{ color: COLORS.muted, fontSize: 10, marginTop: 4, letterSpacing: 2 }}>
            SCRIPT MASTER LABS LLC · FULL SHIELD · 24/7
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: COLORS.muted, fontSize: 10 }}>LAST CYCLE</div>
          <div style={{ color: COLORS.gold, fontSize: 11 }}>{stats.lastCycle ? new Date(stats.lastCycle).toLocaleTimeString() : "—"}</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <StatCard label="Gaps Detected" value={stats.gapsDetected} color={COLORS.green} />
        <StatCard label="Assets Forged" value={stats.assetsForged} color={COLORS.gold} />
        <StatCard label="Distributed" value={stats.distributed} color={COLORS.orange} />
        <StatCard label="Citations Mapped" value={stats.citationsMapped} color={COLORS.pink} />
      </div>

      {/* Feed Panel */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 4 }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}` }}>
          {["gaps", "assets"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: "none", border: "none", padding: "12px 24px",
              color: tab === t ? COLORS.green : COLORS.muted,
              borderBottom: tab === t ? `2px solid ${COLORS.green}` : "2px solid transparent",
              cursor: "pointer", fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
              fontFamily: "inherit",
            }}>
              {t === "gaps" ? `⚡ RECON FEED (${stats.recentGaps.length})` : `🔥 ASSET FORGE (${stats.recentAssets.length})`}
            </button>
          ))}
        </div>

        {/* Feed */}
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {tab === "gaps"
            ? stats.recentGaps.map((g) => <FeedRow key={g.id} item={g} type="gap" />)
            : stats.recentAssets.map((a) => <FeedRow key={a.id} item={a} type="asset" />)
          }
          {(tab === "gaps" ? stats.recentGaps : stats.recentAssets).length === 0 && (
            <div style={{ color: COLORS.muted, padding: 24, textAlign: "center", fontSize: 12 }}>
              AWAITING RECON DATA...
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Status */}
      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        {[
          { label: "RECON SWARM", color: COLORS.green },
          { label: "ASSET FORGE", color: COLORS.gold },
          { label: "SYNDICATE ROUTER", color: COLORS.orange },
          { label: "SCHEMA ENGINE", color: COLORS.pink },
          { label: "REDIS", color: COLORS.green },
        ].map(({ label, color }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 4, padding: "6px 12px", fontSize: 10, letterSpacing: 1,
          }}>
            <PulseDot active />
            <span style={{ color }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ color: COLORS.muted, fontSize: 9, marginTop: 24, letterSpacing: 2 }}>
        © SCRIPT MASTER LABS LLC · SDVOSB · KINSTON NC · scriptmasterlabs.com
      </div>
    </div>
  );
}
