import { useState } from "react";
import { TENET_DEFS, makeTenet } from "../hooks/scoutUtils";
import { DRAFT_ROULETTE_LEAGUES } from "../hooks/draftUtils";
import KitSwatch from "./KitSwatch";

// Club Tenets: each human club picks 1–2 soft draw-bias preferences at creation.
// (Homegrown/nation is omitted from the v1 picker — see spec.)
const PICKABLE = TENET_DEFS.filter(d => d.key !== "homegrown");

export default function ScoutTenetsScreen({ clubs, onStart, onBack }) {
  const humanIdx = clubs.map((c, i) => (c.isComputer ? null : i)).filter(i => i !== null);
  const [step, setStep] = useState(0);
  // selections[clubIndex] = { keys:Set, league:string }
  const [selections, setSelections] = useState(() => Object.fromEntries(humanIdx.map(i => [i, { keys: new Set(), league: "premier_league" }])));

  const idx = humanIdx[step];
  const club = clubs[idx];
  const sel = selections[idx];

  function toggle(key) {
    setSelections(prev => {
      const cur = prev[idx];
      const keys = new Set(cur.keys);
      if (keys.has(key)) keys.delete(key);
      else if (keys.size < 2) keys.add(key);
      // Mutually exclusive era tenets, and mutually exclusive archetype tenets.
      if (key === "old_guard") keys.delete("academy");
      if (key === "academy") keys.delete("old_guard");
      if (key === "front_foot") keys.delete("backs_wall");
      if (key === "backs_wall") keys.delete("front_foot");
      return { ...prev, [idx]: { ...cur, keys } };
    });
  }

  function setLeague(league) {
    setSelections(prev => ({ ...prev, [idx]: { ...prev[idx], league } }));
  }

  function buildTenets(clubIndex) {
    const s = selections[clubIndex];
    return [...s.keys].map(key => {
      const def = PICKABLE.find(d => d.key === key);
      return def.type === "league" ? makeTenet(def, s.league) : makeTenet(def);
    });
  }

  function next() {
    if (step < humanIdx.length - 1) { setStep(step + 1); window.scrollTo(0, 0); return; }
    // Assemble a tenets array aligned to clubs indices (CPUs left empty → auto-assigned).
    const tenets = clubs.map((c, i) => (selections[i] ? buildTenets(i) : []));
    onStart(tenets);
  }

  return (
    <div className="setup-screen">
      <div className="bw-frame bw-scout-lobby">
        <div className="bw-banner">
          <div className="bw-banner-title bw-scout-title">CLUB TENETS</div>
          <div className="bw-banner-subtitle">Pick up to 2 — they softly bias the players your scouts bring you.</div>
        </div>

        <div className="bw-body">
          <div className="scout-tenet-club">
            <KitSwatch primary={club?.primaryColor} secondary={club?.secondaryColor} pattern={club?.pattern || "plain"} uid={`tenet-${idx}`} size={26} />
            <span className="bw-signing-name">{club?.clubName || club?.dofName}</span>
            {humanIdx.length > 1 && <span className="bw-signing-meta">manager {step + 1} of {humanIdx.length}</span>}
          </div>

          <div className="scout-tenet-grid">
            {PICKABLE.map(def => {
              const on = sel.keys.has(def.key);
              const locked = !on && sel.keys.size >= 2;
              return (
                <button
                  key={def.key}
                  className={`scout-tenet-card ${on ? "on" : ""} ${locked ? "locked" : ""}`}
                  onClick={() => !locked && toggle(def.key)}
                  disabled={locked}
                >
                  <span className="scout-tenet-name">{def.label}</span>
                  <span className="scout-tenet-desc">{def.desc}</span>
                  {def.type === "league" && on && (
                    <select
                      className="bw-setup-select accent"
                      value={sel.league}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); setLeague(e.target.value); }}
                    >
                      {DRAFT_ROULETTE_LEAGUES.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                    </select>
                  )}
                </button>
              );
            })}
          </div>

          <div className="bw-setup-hint" style={{ textAlign: "center" }}>
            {sel.keys.size === 0 ? "No tenets — play it neutral, if you like." : `${sel.keys.size} selected`}
          </div>

          <button className="bw-cta-primary" style={{ marginTop: 10 }} onClick={next}>
            {step < humanIdx.length - 1 ? "NEXT MANAGER →" : "START DRAFT →"}
          </button>
          {onBack && step === 0 && <button className="bw-about-link" onClick={onBack}>← back</button>}
          {step > 0 && <button className="bw-about-link" onClick={() => setStep(step - 1)}>← previous manager</button>}
        </div>
      </div>
    </div>
  );
}
