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
];

const TIER_CONFIG = [
  { key: "T1", label: "T1 — Icons",       sub: "93+ rated legends" },
  { key: "T2", label: "T2 — Stars",       sub: "88–92 elite players" },
  { key: "T3", label: "T3 — Quality",     sub: "83–87 solid pros" },
  { key: "T4", label: "T4 — Reliable",    sub: "78–82 squad players" },
  { key: "T5", label: "T5 — Journeymen",  sub: "Below 78 — grafters" },
];

export default function PlayerPoolScreen({ onConfirm }) {
  const [eras,    setEras]    = useState(ERA_CONFIG.map(e => e.key));
  const [leagues, setLeagues] = useState(LEAGUE_CONFIG.map(l => l.key));
  const [tiers,   setTiers]   = useState(TIER_CONFIG.map(t => t.key));

  function toggle(arr, setArr, key) {
    setArr(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  const poolSize = new Set(
    PLAYERS
      .filter(p => eras.includes(p.era) && leagues.includes(p.league) && tiers.includes(p.tier))
      .map(p => p.name)
  ).size;

  const tooSmall = poolSize < 20;

  function handleConfirm() {
    onConfirm({ eras, leagues, tiers });
  }

  return (
    <div className="player-pool-screen">
      <div className="mgr-draft-header">
        <div className="mgr-draft-title">BUILD YOUR PLAYER POOL</div>
        <div className="mgr-draft-sub">Choose which eras, leagues &amp; tiers to draft from</div>
      </div>

      <div className="player-pool-grid">
        <div className="player-pool-section">
          <div className="mgr-pool-section-title">ERAS</div>
          <div className="mgr-pool-checks">
            {ERA_CONFIG.map(cfg => {
              const count = new Set(PLAYERS.filter(p => p.era === cfg.key).map(p => p.name)).size;
              const checked = eras.includes(cfg.key);
              return (
                <label key={cfg.key} className={`mgr-pool-check${checked ? " checked" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(eras, setEras, cfg.key)} />
                  <span className="mgr-pool-flag">{cfg.flag}</span>
                  <span className="mgr-pool-label">
                    {cfg.label}
                    <span className="mgr-pool-sub">{cfg.sub}</span>
                  </span>
                  <span className="mgr-pool-count">{count}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="player-pool-section">
          <div className="mgr-pool-section-title">LEAGUES</div>
          <div className="mgr-pool-checks">
            {LEAGUE_CONFIG.map(cfg => {
              const count = new Set(PLAYERS.filter(p => p.league === cfg.key).map(p => p.name)).size;
              const checked = leagues.includes(cfg.key);
              return (
                <label key={cfg.key} className={`mgr-pool-check${checked ? " checked" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(leagues, setLeagues, cfg.key)} />
                  <span className="mgr-pool-flag">{cfg.flag}</span>
                  <span className="mgr-pool-label">{cfg.label}</span>
                  <span className="mgr-pool-count">{count}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="player-pool-section">
          <div className="mgr-pool-section-title">TIERS</div>
          <div className="mgr-pool-checks">
            {TIER_CONFIG.map(cfg => {
              const count = new Set(PLAYERS.filter(p => p.tier === cfg.key).map(p => p.name)).size;
              const checked = tiers.includes(cfg.key);
              return (
                <label key={cfg.key} className={`mgr-pool-check${checked ? " checked" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(tiers, setTiers, cfg.key)} />
                  <span className="mgr-pool-label">
                    {cfg.label}
                    <span className="mgr-pool-sub">{cfg.sub}</span>
                  </span>
                  <span className="mgr-pool-count">{count}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`mgr-pool-total${tooSmall ? " too-small" : ""}`}>
        {tooSmall
          ? `Only ~${poolSize} unique players — select more options to continue`
          : `~${poolSize} unique players in pool`}
      </div>

      <button className="mgr-go-btn" disabled={tooSmall} onClick={handleConfirm}>
        ▶ START THE DRAFT
      </button>
    </div>
  );
}
