import { useState } from "react";
import { PLAYERS } from "../data/players";

const ERA_CONFIG = [
  { key: "classic", label: "Classic",  sub: "1998–2008", flag: "📼" },
  { key: "golden",  label: "Golden",   sub: "2008–2016", flag: "⭐" },
  { key: "modern",  label: "Modern",   sub: "2016–",     flag: "🔵" },
];

const LEAGUE_CONFIG = [
  { key: "premier_league", label: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { key: "la_liga",        label: "La Liga",        flag: "🇪🇸" },
  { key: "serie_a",        label: "Serie A",        flag: "🇮🇹" },
  { key: "bundesliga",     label: "Bundesliga",     flag: "🇩🇪" },
  { key: "ligue_1",        label: "Ligue 1",        flag: "🇫🇷" },
  { key: "legends",        label: "Legends",        flag: "⚜️" },
];

const TIER_CONFIG = [
  { key: "T1", label: "T1 — Icons",       sub: "93+ rated legends" },
  { key: "T2", label: "T2 — Stars",       sub: "88–92 elite players" },
  { key: "T3", label: "T3 — Quality",     sub: "83–87 solid pros" },
  { key: "T4", label: "T4 — Reliable",    sub: "78–82 squad players" },
  { key: "T5", label: "T5 — Journeymen",  sub: "Below 78 — grafters" },
];

export default function PlayerPoolScreen({ onConfirm, numClubs = 4 }) {
  const [eras,    setEras]    = useState(ERA_CONFIG.map(e => e.key));
  const [leagues, setLeagues] = useState(LEAGUE_CONFIG.map(l => l.key).filter(k => k !== "legends"));
  const [tiers,   setTiers]   = useState(TIER_CONFIG.map(t => t.key));

  function toggle(arr, setArr, key) {
    setArr(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  const poolSize = new Set(
    PLAYERS
      .filter(p =>
        leagues.includes(p.league) &&
        tiers.includes(p.tier) &&
        (p.league === "legends" || eras.includes(p.era))
      )
      .map(p => p.name)
  ).size;

  const minPool = numClubs * 16;
  const tooSmall = poolSize < minPool;

  function handleConfirm() {
    onConfirm({ eras, leagues, tiers });
  }

  return (
    <div className="setup-screen">
      <div className="bw-frame">
        <div className="bw-banner">
          <div className="bw-banner-title">PLAYER POOL</div>
          <div className="bw-banner-subtitle">Choose which eras, leagues &amp; tiers to draft from</div>
        </div>

        <div className="bw-body">
          <div className="bw-field">
            <div className="bw-field-label">ERAS</div>
            <div className="bw-pool-list">
              {ERA_CONFIG.map(cfg => {
                const count = new Set(PLAYERS.filter(p => p.era === cfg.key).map(p => p.name)).size;
                const checked = eras.includes(cfg.key);
                return (
                  <label key={cfg.key} className={`bw-pool-row ${checked ? "checked" : "unchecked"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(eras, setEras, cfg.key)} />
                    <span className="bw-pool-check-icon">{checked ? "✓" : ""}</span>
                    <span className="bw-pool-flag">{cfg.flag}</span>
                    <span className="bw-pool-label-wrap">
                      <span className="bw-pool-label">{cfg.label}</span>
                      <span className="bw-pool-label-sub">{cfg.sub}</span>
                    </span>
                    <span className="bw-pool-count">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bw-field">
            <div className="bw-field-label">LEAGUES</div>
            <div className="bw-pool-list">
              {LEAGUE_CONFIG.map(cfg => {
                const count = new Set(PLAYERS.filter(p => p.league === cfg.key).map(p => p.name)).size;
                const checked = leagues.includes(cfg.key);
                return (
                  <label key={cfg.key} className={`bw-pool-row ${checked ? "checked" : "unchecked"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(leagues, setLeagues, cfg.key)} />
                    <span className="bw-pool-check-icon">{checked ? "✓" : ""}</span>
                    <span className="bw-pool-flag">{cfg.flag}</span>
                    <span className="bw-pool-label">{cfg.label}</span>
                    <span className="bw-pool-count">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bw-field">
            <div className="bw-field-label">TIERS</div>
            <div className="bw-pool-list">
              {TIER_CONFIG.map(cfg => {
                const count = new Set(PLAYERS.filter(p => p.tier === cfg.key).map(p => p.name)).size;
                const checked = tiers.includes(cfg.key);
                return (
                  <label key={cfg.key} className={`bw-pool-row ${checked ? "checked" : "unchecked"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(tiers, setTiers, cfg.key)} />
                    <span className="bw-pool-check-icon">{checked ? "✓" : ""}</span>
                    <span className="bw-pool-label-wrap">
                      <span className="bw-pool-label">{cfg.label}</span>
                      <span className="bw-pool-label-sub">{cfg.sub}</span>
                    </span>
                    <span className="bw-pool-count">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className={`bw-pool-total ${tooSmall ? "too-small" : ""}`}>
            {tooSmall
              ? `Only ~${poolSize} unique players — need ~${minPool} for ${numClubs} teams. Select more options.`
              : <><strong>{poolSize}</strong> unique players in pool</>}
          </div>

          <button className="bw-cta-arcade" disabled={tooSmall} onClick={handleConfirm}>
            ▶ START THE DRAFT
          </button>
        </div>
      </div>
    </div>
  );
}
