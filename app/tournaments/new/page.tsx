"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { autoDistributeGroups, buildBracketRounds, generateMatchDays } from "@/lib/tournamentLogic";
import { SPORTS, defaultTeamColors } from "@/lib/tournamentConstants";
import TeamLogo from "@/components/tournaments/TeamLogo";
import TeamCustomizer, { TeamMeta } from "@/components/tournaments/TeamCustomizer";
import GoogleButton from "@/components/tournaments/GoogleButton";

type Format = "single" | "round" | "groups";
type LegFormat = "single" | "double";
type Seeding = "random" | "manual";
type Group = { label: string; teamIds: number[] };

function defaultTeamMeta(index: number): TeamMeta {
  return { ...defaultTeamColors(index), logoType: "preset", logoIndex: index % 10, logoData: null };
}

function byesFor(count: number) {
  let size = 1;
  while (size < count) size *= 2;
  return size - count;
}

// Nominatim's display_name is full street-address detail; the tournament's
// general location just needs city/region/country, e.g. "Vaughan, ON, Canada".
function formatCityStateCountry(address?: Record<string, string>): string | null {
  if (!address) return null;
  const city = address.city || address.town || address.village || address.suburb || address.municipality || address.county;
  const iso = address["ISO3166-2-lvl4"];
  const state = (iso && iso.includes("-") ? iso.split("-")[1] : null) || address.state;
  const country = address.country;
  return [city, state, country].filter(Boolean).join(", ") || null;
}

const DRAFT_KEY = "bracket_tournament_draft_v1";

type Draft = {
  info: { name: string; sport: string; location: string; startDate: string; endDate: string; format: Format; legFormat: LegFormat };
  teamNames: string[];
  teamMeta: TeamMeta[];
  seeding: Seeding | null;
  manualOrder: number[] | null;
  numGroups: 2 | 4;
  advancePerGroup: 1 | 2;
  groups: Group[] | null;
  finalOrder: number[] | null;
};

function saveDraft(draft: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {}
}

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export default function NewTournamentPage() {
  const [session, setSession] = useState<any>(undefined);
  const [authEmail, setAuthEmail] = useState("");
  const [authSent, setAuthSent] = useState(false);

  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [info, setInfo] = useState({
    name: "",
    sport: "Soccer",
    location: "",
    startDate: "",
    endDate: "",
    format: "single" as Format,
    legFormat: "single" as LegFormat,
  });

  const [teamNames, setTeamNames] = useState<string[]>(["", "", "", ""]);
  const [teamMeta, setTeamMeta] = useState<TeamMeta[]>([0, 1, 2, 3].map(defaultTeamMeta));
  const [openPanelIndex, setOpenPanelIndex] = useState<number | null>(null);

  const [seeding, setSeeding] = useState<Seeding | null>(null);
  const [manualOrder, setManualOrder] = useState<number[] | null>(null);

  const [numGroups, setNumGroups] = useState<2 | 4>(2);
  const [advancePerGroup, setAdvancePerGroup] = useState<1 | 2>(2);
  const [groups, setGroups] = useState<Group[] | null>(null);

  const [finalOrder, setFinalOrder] = useState<number[] | null>(null);

  const [knownLocations, setKnownLocations] = useState<string[]>([]);
  const nominatimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ tournamentId: string; shareSlug: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  // Restores a tournament that was fully set up but paused for sign-in
  // (see handleSendMagicLink) — the magic link redirect reloads the page,
  // so this brings the organizer back to the review step with everything
  // they'd already entered.
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    setInfo(draft.info);
    setTeamNames(draft.teamNames);
    setTeamMeta(draft.teamMeta);
    setSeeding(draft.seeding);
    setManualOrder(draft.manualOrder);
    setNumGroups(draft.numGroups);
    setAdvancePerGroup(draft.advancePerGroup);
    setGroups(draft.groups);
    setFinalOrder(draft.finalOrder);
    setStep(5);
    clearDraft();
  }, []);

  function saveCurrentDraft() {
    saveDraft({ info, teamNames, teamMeta, seeding, manualOrder, numGroups, advancePerGroup, groups, finalOrder });
  }

  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    saveCurrentDraft();
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: authEmail,
        options: { emailRedirectTo: window.location.href },
      });
      if (otpError) throw otpError;
      setAuthSent(true);
    } catch (err: any) {
      setError(err.message || "Could not send the sign-in link. Please try again.");
    }
  }

  function registerLocation(loc: string) {
    const trimmed = loc.trim();
    if (!trimmed) return;
    setKnownLocations((prev) =>
      prev.some((l) => l.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]
    );
  }

  function suggestFromNominatim(query: string) {
    if (nominatimTimer.current) clearTimeout(nominatimTimer.current);
    if (!query || query.trim().length < 3) return;
    nominatimTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&limit=5`
        );
        const results = await res.json();
        results.forEach((place: { address?: Record<string, string> }) => {
          const formatted = formatCityStateCountry(place.address);
          if (formatted) registerLocation(formatted);
        });
      } catch {
        // Offline or request blocked — suggestions silently stay limited to previously entered locations.
      }
    }, 500);
  }

  function addTeam() {
    setTeamNames((prev) => [...prev, ""]);
    setTeamMeta((prev) => [...prev, defaultTeamMeta(prev.length)]);
  }

  function removeTeam(i: number) {
    if (teamNames.length <= 2) return;
    setTeamNames((prev) => prev.filter((_, idx) => idx !== i));
    setTeamMeta((prev) => prev.filter((_, idx) => idx !== i));
    setOpenPanelIndex(null);
  }

  function goToStep3() {
    setTeamNames((prev) => prev.map((t, i) => t.trim() || `Team ${i + 1}`));
    if (teamNames.length < 2) {
      setError("You need at least 2 teams.");
      return;
    }
    setError(null);
    if (info.format === "groups") {
      setGroups(
        autoDistributeGroups(
          teamNames.map((_, i) => i),
          numGroups
        )
      );
    } else {
      setManualOrder(teamNames.map((_, i) => i));
      setSeeding(null);
    }
    setStep(3);
  }

  function reshuffleGroups(n = numGroups) {
    const shuffled = teamNames.map((_, i) => i);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setGroups(autoDistributeGroups(shuffled, n));
  }

  function moveTeamToGroup(teamIndex: number, targetLabel: string) {
    if (!groups) return;
    setGroups(
      groups.map((g) => ({
        ...g,
        teamIds:
          g.label === targetLabel
            ? [...g.teamIds.filter((t) => t !== teamIndex), teamIndex]
            : g.teamIds.filter((t) => t !== teamIndex),
      }))
    );
  }

  function moveManual(i: number, dir: -1 | 1) {
    if (!manualOrder) return;
    const j = i + dir;
    if (j < 0 || j >= manualOrder.length) return;
    const next = manualOrder.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setManualOrder(next);
  }

  function goToPreview() {
    if (info.format === "groups") {
      const tooSmall = groups?.some((g) => g.teamIds.length < advancePerGroup + 1);
      if (tooSmall) {
        setError("Each group needs more teams than the number advancing.");
        return;
      }
    } else if (!seeding) {
      setError("Choose a seeding method.");
      return;
    }
    setError(null);
    if (info.format !== "groups") {
      let order = teamNames.map((_, i) => i);
      if (seeding === "random") {
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
      } else {
        order = manualOrder ?? order;
      }
      setFinalOrder(order);
    }
    setStep(4);
  }

  async function handleCreate() {
    if (!session) return;
    setSubmitting(true);
    setError(null);
    try {
      let order: number[];
      let groupLabelFor: (i: number) => string | null = () => null;

      if (info.format === "groups") {
        order = teamNames.map((_, i) => i);
        const labelByIndex = new Map<number, string>();
        groups?.forEach((g) => g.teamIds.forEach((idx) => labelByIndex.set(idx, g.label)));
        groupLabelFor = (i) => labelByIndex.get(i) ?? null;
      } else {
        // Frozen at the preview step so what the organizer saw there is exactly what gets created.
        order = finalOrder ?? teamNames.map((_, i) => i);
      }

      const teams = order.map((i) => ({
        name: teamNames[i],
        colorA: teamMeta[i].colorA,
        colorB: teamMeta[i].colorB,
        logoType: teamMeta[i].logoType,
        logoIndex: teamMeta[i].logoIndex,
        logoData: teamMeta[i].logoData,
        groupLabel: groupLabelFor(i),
      }));

      const token = session?.access_token;
      const createRes = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: info.name,
          sport: info.sport,
          format: info.format,
          legFormat: info.legFormat,
          startDate: info.startDate || null,
          endDate: info.endDate || null,
          location: info.location || null,
          seeding: info.format === "groups" ? null : seeding,
          groupCount: info.format === "groups" ? numGroups : null,
          advancePerGroup: info.format === "groups" ? advancePerGroup : null,
          teams,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Could not create the tournament.");

      const genRes = await fetch(`/api/tournaments/${createData.tournamentId}/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || "Tournament was created, but the schedule failed to generate.");

      setResult({ tournamentId: createData.tournamentId, shareSlug: createData.shareSlug });
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (session === undefined) {
    return <div className="t-wrap" />;
  }

  if (result) {
    return (
      <div className="t-wrap">
        <Brand />
        <div className="champ-card">
          <div className="trophy">🏆</div>
          <div className="label">Tournament created</div>
          <div className="name">{info.name}</div>
          <div className="sub">Share this link with players and spectators</div>
          <div className="link-box">
            <span>findmydrink.ca/t/{result.shareSlug}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="t-wrap">
      <Brand />
      <div className="steps">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`step-dot ${i + 1 < step ? "done" : i + 1 === step ? "active" : ""}`} />
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}

      {step === 1 && (
        <div className="card">
          <p className="step-label">Step 1 of {totalSteps}</p>
          <h1>Tournament details</h1>
          <p className="hint">Start with the basics.</p>

          <label>Tournament name</label>
          <input
            type="text"
            placeholder="e.g. Friday Night Soccer Cup"
            value={info.name}
            onChange={(e) => setInfo({ ...info, name: e.target.value })}
          />

          <label>Sport</label>
          <select value={info.sport} onChange={(e) => setInfo({ ...info, sport: e.target.value })}>
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <label>Location</label>
          <input
            type="text"
            placeholder="e.g. Vaughan, ON, Canada"
            value={info.location}
            list="knownLocations"
            onChange={(e) => {
              setInfo({ ...info, location: e.target.value });
              suggestFromNominatim(e.target.value);
            }}
            onBlur={(e) => registerLocation(e.target.value)}
          />
          <datalist id="knownLocations">
            {knownLocations.map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>

          <div className="field-row">
            <div>
              <label>Start date</label>
              <input type="date" value={info.startDate} onChange={(e) => setInfo({ ...info, startDate: e.target.value })} />
            </div>
            <div>
              <label>End date</label>
              <input type="date" value={info.endDate} onChange={(e) => setInfo({ ...info, endDate: e.target.value })} />
            </div>
          </div>

          <label>Format</label>
          <div className="fmt-options">
            {(
              [
                ["single", "Single elim", "Lose once, you're out"],
                ["round", "Round robin", "Everyone plays everyone"],
                ["groups", "Groups + knockout", "Group stage, then playoffs"],
              ] as const
            ).map(([fmt, title, desc]) => (
              <div
                key={fmt}
                className={`fmt-opt ${info.format === fmt ? "sel" : ""}`}
                onClick={() => setInfo({ ...info, format: fmt })}
              >
                <b>{title}</b>
                <span>{desc}</span>
              </div>
            ))}
          </div>

          <div className="btn-row">
            <button
              className="btn btn-primary btn-block"
              onClick={() => {
                if (info.startDate && info.endDate && info.endDate < info.startDate) {
                  setError("End date can't be before the start date.");
                  return;
                }
                setError(null);
                setInfo((prev) => ({ ...prev, name: prev.name.trim() || "Untitled tournament" }));
                setStep(2);
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <p className="step-label">Step 2 of {totalSteps}</p>
          <h1>Teams</h1>
          <p className="hint">Add team or player names. No account needed for them.</p>

          <div className="team-list">
            {teamNames.map((name, i) => (
              <div key={i}>
                <div className="team-row">
                  <div className="team-num">{i + 1}</div>
                  <button
                    type="button"
                    className="team-customize-btn"
                    title="Colors and logo"
                    onClick={() => setOpenPanelIndex(openPanelIndex === i ? null : i)}
                  >
                    <TeamLogo index={teamMeta[i].logoIndex} colorA={teamMeta[i].colorA} colorB={teamMeta[i].colorB} size={26} />
                  </button>
                  <input
                    type="text"
                    placeholder={`Team ${i + 1} name`}
                    value={name}
                    onChange={(e) => setTeamNames((prev) => prev.map((t, idx) => (idx === i ? e.target.value : t)))}
                  />
                  <button type="button" className="icon-btn" title="Remove" onClick={() => removeTeam(i)}>
                    &times;
                  </button>
                </div>
                {openPanelIndex === i && (
                  <TeamCustomizer
                    meta={teamMeta[i]}
                    onChange={(meta) => setTeamMeta((prev) => prev.map((m, idx) => (idx === i ? meta : m)))}
                    onDone={() => setOpenPanelIndex(null)}
                  />
                )}
              </div>
            ))}
          </div>

          <button type="button" className="btn btn-block" onClick={addTeam}>
            + Add team
          </button>

          {info.format === "single" &&
            (() => {
              const byes = byesFor(teamNames.length);
              return byes > 0 ? (
                <p className="note" style={{ textAlign: "left", marginTop: 8 }}>
                  {teamNames.length} teams isn't a power of 2, so {byes} team{byes === 1 ? "" : "s"} will get a bye
                  (automatic pass) in round 1.
                </p>
              ) : null;
            })()}

          {(info.format === "round" || info.format === "groups") && (
            <div style={{ marginTop: 12 }}>
              <label>Match format</label>
              <div className="seed-choice">
                <div
                  className={`seed-card ${info.legFormat === "single" ? "sel" : ""}`}
                  onClick={() => setInfo({ ...info, legFormat: "single" })}
                >
                  <b>Single match</b>
                  <span>Play each opponent once</span>
                </div>
                <div
                  className={`seed-card ${info.legFormat === "double" ? "sel" : ""}`}
                  onClick={() => setInfo({ ...info, legFormat: "double" })}
                >
                  <b>Home and away</b>
                  <span>Play each opponent twice</span>
                </div>
              </div>
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={goToStep3}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && info.format === "groups" && groups && (
        <div className="card">
          <p className="step-label">Step 3 of {totalSteps}</p>
          <h1>Group setup</h1>
          <p className="hint">Split teams into groups. Top teams from each group cross over into the knockout stage.</p>

          <label>Number of groups</label>
          <div className="count-choice">
            {[2, 4].map((n) => (
              <div
                key={n}
                className={`count-btn ${numGroups === n ? "sel" : ""}`}
                onClick={() => {
                  setNumGroups(n as 2 | 4);
                  reshuffleGroupsKeepOrder(n as 2 | 4);
                }}
              >
                {n} groups
              </div>
            ))}
          </div>

          <label>Teams advancing per group</label>
          <div className="count-choice">
            {[1, 2].map((n) => (
              <div key={n} className={`count-btn ${advancePerGroup === n ? "sel" : ""}`} onClick={() => setAdvancePerGroup(n as 1 | 2)}>
                Top {n}
              </div>
            ))}
          </div>

          {groups.map((g) => (
            <div className="group-block" key={g.label}>
              <h3>Group {g.label}</h3>
              {g.teamIds.map((teamIdx) => (
                <div className="group-team-row" key={teamIdx}>
                  <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                    <TeamLogo index={teamMeta[teamIdx].logoIndex} colorA={teamMeta[teamIdx].colorA} colorB={teamMeta[teamIdx].colorB} size={18} />
                    {teamNames[teamIdx]}
                  </span>
                  <select value={g.label} onChange={(e) => moveTeamToGroup(teamIdx, e.target.value)}>
                    {groups!.map((og) => (
                      <option key={og.label} value={og.label}>
                        {og.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ))}

          <button type="button" className="btn btn-block" onClick={() => reshuffleGroups()}>
            Shuffle teams into groups
          </button>

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>
              Back
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={goToPreview}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && info.format !== "groups" && (
        <div className="card">
          <p className="step-label">Step 3 of {totalSteps}</p>
          <h1>Seeding</h1>
          <p className="hint">Match teams randomly, or set the order yourself?</p>

          <div className="seed-choice">
            <div className={`seed-card ${seeding === "random" ? "sel" : ""}`} onClick={() => setSeeding("random")}>
              <b>Random</b>
              <span>System shuffles automatically</span>
            </div>
            <div className={`seed-card ${seeding === "manual" ? "sel" : ""}`} onClick={() => setSeeding("manual")}>
              <b>I'll set the order</b>
              <span>Arrange teams manually</span>
            </div>
          </div>

          {seeding === "manual" && manualOrder && (
            <div className="team-list" style={{ marginTop: 12 }}>
              {manualOrder.map((teamIdx, i) => (
                <div className="team-row" key={teamIdx}>
                  <div className="team-num">{i + 1}</div>
                  <TeamLogo index={teamMeta[teamIdx].logoIndex} colorA={teamMeta[teamIdx].colorA} colorB={teamMeta[teamIdx].colorB} size={22} />
                  <span style={{ flex: 1 }}>{teamNames[teamIdx]}</span>
                  <button type="button" className="move-btn" onClick={() => moveManual(i, -1)} disabled={i === 0}>
                    ↑
                  </button>
                  <button type="button" className="move-btn" onClick={() => moveManual(i, 1)} disabled={i === manualOrder.length - 1}>
                    ↓
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>
              Back
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={goToPreview}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <p className="step-label">Step 4 of {totalSteps}</p>
          <h1>{info.format === "groups" ? "Group fixtures" : info.format === "round" ? "Match day 1" : "Round 1 matchups"}</h1>
          <p className="hint">
            {info.format === "groups"
              ? "This is what the group stage will look like. Scores are entered once the tournament is created."
              : info.format === "round"
              ? "This is the opening match day. The full season schedule unlocks once the tournament is created."
              : "This is the opening round bracket. A bye means that team advances automatically."}
          </p>

          {info.format === "groups" &&
            groups?.map((g) => {
              const days = generateMatchDays(g.teamIds, info.legFormat === "double");
              return (
                <div className="group-block" key={g.label}>
                  <h3>
                    Group {g.label} · Match day 1
                  </h3>
                  {days[0]?.map((f, i) => matchupRow(i, f.a as number, f.b as number))}
                  {days.length > 1 && (
                    <p className="note" style={{ margin: "6px 0 0" }}>
                      {days.length - 1} more match day{days.length - 1 === 1 ? "" : "s"} once the tournament is created.
                    </p>
                  )}
                </div>
              );
            })}

          {info.format === "round" &&
            finalOrder &&
            (() => {
              const days = generateMatchDays(finalOrder, info.legFormat === "double");
              return (
                <>
                  {days[0]?.map((f, i) => matchupRow(i, f.a as number, f.b as number))}
                  {days.length > 1 && (
                    <p className="note">
                      {days.length - 1} more match day{days.length - 1 === 1 ? "" : "s"} once the tournament is created.
                    </p>
                  )}
                </>
              );
            })()}

          {info.format === "single" &&
            finalOrder &&
            buildBracketRounds(finalOrder)[0]?.map((m, i) =>
              m.a !== null && m.b !== null ? (
                matchupRow(i, m.a as number, m.b as number)
              ) : (
                <div className="fixture-row" key={i}>
                  <span className="fname" style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                    <TeamLogo
                      index={teamMeta[(m.a ?? m.b) as number].logoIndex}
                      colorA={teamMeta[(m.a ?? m.b) as number].colorA}
                      colorB={teamMeta[(m.a ?? m.b) as number].colorB}
                      size={16}
                    />
                    {teamNames[(m.a ?? m.b) as number]}
                  </span>
                  <span className="vs" style={{ color: "var(--green-light)", fontWeight: 700 }}>
                    BYE
                  </span>
                </div>
              )
            )}

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setStep(3)}>
              Back
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(5)}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="card">
          <p className="step-label">Step {totalSteps} of {totalSteps}</p>
          <h1>Review</h1>
          <div className="summary-row">
            <span className="k">Name</span>
            <span className="v">{info.name}</span>
          </div>
          <div className="summary-row">
            <span className="k">Sport</span>
            <span className="v">{info.sport}</span>
          </div>
          <div className="summary-row">
            <span className="k">Format</span>
            <span className="v">
              {info.format === "single" ? "Single elimination" : info.format === "round" ? "Round robin" : "Groups + knockout"}
            </span>
          </div>
          <div className="summary-row">
            <span className="k">Teams</span>
            <span className="v">{teamNames.length}</span>
          </div>
          {info.format === "groups" ? (
            <div className="summary-row">
              <span className="k">Groups</span>
              <span className="v">
                {numGroups} groups, top {advancePerGroup} advance
              </span>
            </div>
          ) : (
            <div className="summary-row">
              <span className="k">Seeding</span>
              <span className="v">{seeding === "random" ? "Random" : "Manual"}</span>
            </div>
          )}
          {info.format !== "single" && (
            <div className="summary-row">
              <span className="k">Match format</span>
              <span className="v">{info.legFormat === "double" ? "Home and away" : "Single match"}</span>
            </div>
          )}

          <p className="note">This will create the tournament and generate the full match schedule.</p>

          {session ? (
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={() => setStep(4)} disabled={submitting}>
                Back
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleCreate} disabled={submitting}>
                {submitting ? "Creating…" : "Create tournament"}
              </button>
            </div>
          ) : (
            <>
              <p className="hint" style={{ textAlign: "center", margin: "4px 0 14px" }}>
                Sign in to save this tournament — we'll email you a link and bring you right back here.
              </p>
              {authSent ? (
                <p style={{ color: "var(--green-light)", fontSize: 14, textAlign: "center" }}>
                  Check your email for a sign-in link.
                </p>
              ) : (
                <>
                  <GoogleButton onBeforeRedirect={saveCurrentDraft} />
                  <p className="t-divider">or continue with email</p>
                  <form onSubmit={handleSendMagicLink}>
                    <input
                      type="text"
                      placeholder="name@example.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                    />
                    <button className="btn btn-primary btn-block" type="submit">
                      Send sign-in link
                    </button>
                  </form>
                </>
              )}
              <div className="btn-row">
                <button className="btn btn-ghost btn-block" onClick={() => setStep(4)}>
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  function matchupRow(key: number, a: number, b: number) {
    return (
      <div className="fixture-row" key={key}>
        <span className="fname right-align">
          {teamNames[a]}
          <TeamLogo index={teamMeta[a].logoIndex} colorA={teamMeta[a].colorA} colorB={teamMeta[a].colorB} size={16} />
        </span>
        <span className="vs">vs</span>
        <span className="fname">
          <TeamLogo index={teamMeta[b].logoIndex} colorA={teamMeta[b].colorA} colorB={teamMeta[b].colorB} size={16} />
          {teamNames[b]}
        </span>
      </div>
    );
  }

  function reshuffleGroupsKeepOrder(n: 2 | 4) {
    setGroups(
      autoDistributeGroups(
        teamNames.map((_, i) => i),
        n
      )
    );
  }
}

function Brand() {
  return (
    <Link href="/tournaments" className="brand" style={{ textDecoration: "none" }}>
      <div className="brand-mark">B</div>
      <div>
        <div className="brand-name">Bracket</div>
        <div className="brand-sub">Tournament builder</div>
      </div>
    </Link>
  );
}
