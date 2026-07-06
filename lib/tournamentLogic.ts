// Pure tournament logic — no DOM, no framework dependencies.
// Ported directly from the HTML prototype. Works with any "team" identifier
// (a name string during prototyping, a team UUID once wired to Supabase) —
// every function below is generic over whatever identifier you pass in.

// ---------- Seeding ----------

// Standard single-elimination seed order (e.g. for 8: [1,8,4,5,2,7,3,6]).
// Produces the placement so higher seeds meet lower seeds first and byes
// spread out evenly instead of clustering together.
export function seedOrder(n) {
  let order = [1, 2];
  while (order.length < n) {
    const newSize = order.length * 2;
    const newOrder = [];
    order.forEach((s) => {
      newOrder.push(s);
      newOrder.push(newSize + 1 - s);
    });
    order = newOrder;
  }
  return order;
}

// ---------- Single elimination bracket ----------

export function buildBracketRounds(teamIds) {
  let size = 1;
  while (size < teamIds.length) size *= 2;
  const order = seedOrder(size);
  const padded = order.map((seedNum) =>
    seedNum <= teamIds.length ? teamIds[seedNum - 1] : null
  );

  const round1 = [];
  for (let i = 0; i < padded.length; i += 2) {
    const a = padded[i];
    const b = padded[i + 1];
    let winner = null;
    if (a && !b) winner = a;
    if (b && !a) winner = b;
    round1.push({ a, b, scoreA: '', scoreB: '', winner, date: '', time: '', location: '' });
  }

  const rounds = [round1];
  let count = round1.length;
  while (count > 1) {
    count = count / 2;
    const r = [];
    for (let i = 0; i < count; i++) {
      r.push({ a: null, b: null, scoreA: '', scoreB: '', winner: null, date: '', time: '', location: '' });
    }
    rounds.push(r);
  }
  return rounds;
}

// Propagates decided winners forward and resets any downstream match whose
// incoming team changed (so correcting an earlier score doesn't leave stale
// results further into the bracket). Returns { rounds, champion }.
export function recomputeBracket(rounds) {
  for (let r = 0; r < rounds.length - 1; r++) {
    rounds[r].forEach((m, i) => {
      const nextMatch = rounds[r + 1][Math.floor(i / 2)];
      const slotKey = i % 2 === 0 ? 'a' : 'b';
      const incoming = m.winner || null;
      if (nextMatch[slotKey] !== incoming) {
        nextMatch[slotKey] = incoming;
        nextMatch.scoreA = '';
        nextMatch.scoreB = '';
        nextMatch.winner = null;
      }
    });
  }
  const finalMatch = rounds[rounds.length - 1][0];
  const champion = finalMatch && finalMatch.winner ? finalMatch.winner : null;
  return { rounds, champion };
}

// Call after updating scoreA/scoreB on a match to decide (or clear) its winner.
export function checkAutoAdvance(rounds, r, i) {
  const m = rounds[r][i];
  if (!m.a || !m.b) return recomputeBracket(rounds);
  if (m.scoreA === '' || m.scoreB === '') {
    if (m.winner) m.winner = null;
    return recomputeBracket(rounds);
  }
  const sa = parseInt(m.scoreA) || 0;
  const sb = parseInt(m.scoreB) || 0;
  if (sa === sb) {
    if (m.winner) m.winner = null;
    return recomputeBracket(rounds);
  }
  m.winner = sa > sb ? m.a : m.b;
  return recomputeBracket(rounds);
}

export function roundName(totalRounds, r) {
  const remaining = totalRounds - r;
  if (remaining === 1) return 'Final';
  if (remaining === 2) return 'Semifinal';
  if (remaining === 3) return 'Quarterfinal';
  return `Round ${r + 1}`;
}

// ---------- Round robin / match days (circle method) ----------

export function generateMatchDays(teamIds, isDouble) {
  let list = teamIds.slice();
  const hasBye = list.length % 2 !== 0;
  if (hasBye) list.push(null);
  const n = list.length;
  const firstLeg = [];
  for (let day = 0; day < n - 1; day++) {
    const dayMatches = [];
    for (let i = 0; i < n / 2; i++) {
      const home = list[i];
      const away = list[n - 1 - i];
      if (home !== null && away !== null) {
        dayMatches.push({ a: home, b: away, scoreA: '', scoreB: '', date: '', time: '', location: '' });
      }
    }
    firstLeg.push(dayMatches);
    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop());
    list = [fixed, ...rest];
  }
  if (!isDouble) return firstLeg;
  const secondLeg = firstLeg.map((day) =>
    day.map((f) => ({ a: f.b, b: f.a, scoreA: '', scoreB: '', date: '', time: '', location: '' }))
  );
  return firstLeg.concat(secondLeg);
}

export function flattenMatchDays(matchDays) {
  return matchDays.reduce((all, day) => all.concat(day), []);
}

// All-pairs fixture list (used for previews / group stage before match-day
// scheduling is applied).
export function buildFixtures(teamIds, isDouble) {
  const fixtures = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      fixtures.push({ a: teamIds[i], b: teamIds[j], scoreA: '', scoreB: '', date: '', time: '', location: '' });
      if (isDouble) {
        fixtures.push({ a: teamIds[j], b: teamIds[i], scoreA: '', scoreB: '', date: '', time: '', location: '' });
      }
    }
  }
  return fixtures;
}

export function allFixturesPlayed(fixtures) {
  return fixtures.every((f) => f.scoreA !== '' && f.scoreB !== '');
}

// ---------- Standings ----------
// Tiebreaker order: points -> head-to-head result(s) between the tied teams
// (aggregate goal difference if double round-robin) -> overall goal
// difference -> overall goals scored.

export function computeStandings(teamIds, fixtures) {
  const table: Record<string, any> = {};
  teamIds.forEach((t) => {
    table[t] = { name: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
  });
  fixtures.forEach((f) => {
    if (f.scoreA === '' || f.scoreB === '') return;
    const sa = parseInt(f.scoreA) || 0;
    const sb = parseInt(f.scoreB) || 0;
    const ta = table[f.a];
    const tb = table[f.b];
    ta.played++; tb.played++;
    ta.gf += sa; ta.ga += sb; tb.gf += sb; tb.ga += sa;
    if (sa > sb) { ta.won++; ta.pts += 3; tb.lost++; }
    else if (sb > sa) { tb.won++; tb.pts += 3; ta.lost++; }
    else { ta.drawn++; tb.drawn++; ta.pts += 1; tb.pts += 1; }
  });

  const standings = Object.values(table);
  standings.sort((x, y) => {
    if (y.pts !== x.pts) return y.pts - x.pts;
    const h2h = fixtures.filter(
      (f) => (f.a === x.name && f.b === y.name) || (f.a === y.name && f.b === x.name)
    );
    const played = h2h.filter((f) => f.scoreA !== '' && f.scoreB !== '');
    if (played.length > 0) {
      let xg = 0, yg = 0;
      played.forEach((f) => {
        const sa = parseInt(f.scoreA) || 0;
        const sb = parseInt(f.scoreB) || 0;
        if (f.a === x.name) { xg += sa - sb; yg += sb - sa; }
        else { xg += sb - sa; yg += sa - sb; }
      });
      if (xg !== yg) return yg - xg;
    }
    const xgd = x.gf - x.ga, ygd = y.gf - y.ga;
    if (ygd !== xgd) return ygd - xgd;
    return y.gf - x.gf;
  });
  return standings;
}

// ---------- Group stage → knockout crossover ----------
// Ensures qualifiers from the same group never meet before the final.

export function buildCrossoverOrder(groupsWithStandings, advance) {
  if (advance === 1) return groupsWithStandings.map((g) => g.standings[0].name);

  if (groupsWithStandings.length === 2 && advance === 2) {
    const [A, B] = groupsWithStandings;
    return [A.standings[0].name, B.standings[1].name, B.standings[0].name, A.standings[1].name];
  }

  if (groupsWithStandings.length === 4 && advance === 2) {
    const [A, B, C, D] = groupsWithStandings;
    return [
      A.standings[0].name, B.standings[0].name, D.standings[0].name, C.standings[0].name,
      D.standings[1].name, C.standings[1].name, A.standings[1].name, B.standings[1].name,
    ];
  }

  // Fallback for configurations outside the two supported group counts
  // (the app's UI currently only offers 2 or 4 groups for this reason).
  let order = [];
  for (let rank = 0; rank < advance; rank++) {
    const tier = groupsWithStandings.map((g) => g.standings[rank].name);
    if (rank % 2 === 1) tier.reverse();
    order = order.concat(tier);
  }
  return order;
}

// ---------- Auto-distribute teams into groups (snake seeding) ----------

export function autoDistributeGroups(teamIds, numGroups) {
  const groups = [];
  for (let i = 0; i < numGroups; i++) {
    groups.push({ label: String.fromCharCode(65 + i), teamIds: [] });
  }
  let g = 0, dir = 1;
  teamIds.forEach((t) => {
    groups[g].teamIds.push(t);
    g += dir;
    if (g === numGroups) { g = numGroups - 1; dir = -1; }
    else if (g < 0) { g = 0; dir = 1; }
  });
  return groups;
}
