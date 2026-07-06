import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import {
  checkAutoAdvance,
  computeStandings,
  buildCrossoverOrder,
  buildBracketRounds,
  recomputeBracket,
} from '@/lib/tournamentLogic';

type Row = {
  id: string;
  tournament_id: string;
  stage: 'bracket' | 'round_robin' | 'group';
  group_label: string | null;
  round_index: number | null;
  match_index: number;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  winner_id: string | null;
};

// PATCH /api/matches/:id
// Updates a single match's score (and optionally date/time/location), works
// out the winner, and — for bracket-stage matches — propagates that winner
// into the next round. For group-stage matches, once every match in every
// group has been played it generates the crossover knockout bracket.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const matchId = params.id;

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseServer.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  }

  const { data: match, error: matchError } = await supabaseServer
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();
  if (matchError || !match) {
    return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
  }

  const { data: tournament, error: tournamentError } = await supabaseServer
    .from('tournaments')
    .select('*')
    .eq('id', match.tournament_id)
    .single();
  if (tournamentError || !tournament) {
    return NextResponse.json({ error: 'Tournament not found.' }, { status: 404 });
  }
  if (tournament.user_id !== userData.user.id) {
    return NextResponse.json({ error: 'Not your tournament.' }, { status: 403 });
  }

  const body = await request.json();
  const scoreA: string = body.scoreA === undefined || body.scoreA === null ? '' : String(body.scoreA);
  const scoreB: string = body.scoreB === undefined || body.scoreB === null ? '' : String(body.scoreB);

  let winnerId: string | null = null;
  if (scoreA !== '' && scoreB !== '') {
    const sa = parseInt(scoreA) || 0;
    const sb = parseInt(scoreB) || 0;
    if (sa > sb) winnerId = match.team_a_id;
    else if (sb > sa) winnerId = match.team_b_id;
  }

  const { error: updateError } = await supabaseServer
    .from('matches')
    .update({
      score_a: scoreA === '' ? null : parseInt(scoreA) || 0,
      score_b: scoreB === '' ? null : parseInt(scoreB) || 0,
      winner_id: winnerId,
      match_date: body.date ?? match.match_date,
      match_time: body.time ?? match.match_time,
      location: body.location ?? match.location,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (match.stage === 'bracket') {
    await propagateBracket(match.tournament_id, match.round_index!, match.match_index, scoreA, scoreB);
  } else if (match.stage === 'group') {
    await maybeGenerateCrossover(tournament);
  }

  return NextResponse.json({ ok: true, winnerId });
}

async function propagateBracket(
  tournamentId: string,
  updatedRoundIndex: number,
  updatedMatchIndex: number,
  scoreA: string,
  scoreB: string
) {
  const { data: bracketMatches } = await supabaseServer
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('stage', 'bracket')
    .order('round_index', { ascending: true })
    .order('match_index', { ascending: true });
  if (!bracketMatches || bracketMatches.length === 0) return;

  const totalRounds = Math.max(...bracketMatches.map((m: Row) => m.round_index ?? 0)) + 1;
  const rounds: any[][] = Array.from({ length: totalRounds }, () => []);
  bracketMatches.forEach((m: Row) => {
    const r = m.round_index ?? 0;
    rounds[r][m.match_index] = {
      a: m.team_a_id,
      b: m.team_b_id,
      scoreA: m.score_a === null ? '' : String(m.score_a),
      scoreB: m.score_b === null ? '' : String(m.score_b),
      winner: m.winner_id,
      dbId: m.id,
    };
  });

  rounds[updatedRoundIndex][updatedMatchIndex].scoreA = scoreA;
  rounds[updatedRoundIndex][updatedMatchIndex].scoreB = scoreB;
  const { rounds: recomputed, champion } = checkAutoAdvance(rounds, updatedRoundIndex, updatedMatchIndex);

  for (let r = updatedRoundIndex + 1; r < recomputed.length; r++) {
    for (const m of recomputed[r]) {
      await supabaseServer
        .from('matches')
        .update({
          team_a_id: m.a,
          team_b_id: m.b,
          winner_id: m.winner,
          score_a: m.scoreA === '' ? null : parseInt(m.scoreA) || 0,
          score_b: m.scoreB === '' ? null : parseInt(m.scoreB) || 0,
        })
        .eq('id', m.dbId);
    }
  }

  if (champion) {
    await supabaseServer.from('tournaments').update({ status: 'completed' }).eq('id', tournamentId);
  }
}

async function maybeGenerateCrossover(tournament: any) {
  if (tournament.format !== 'groups') return;

  const { count: existingBracketMatches } = await supabaseServer
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournament.id)
    .eq('stage', 'bracket');
  if (existingBracketMatches && existingBracketMatches > 0) return;

  const { data: groupMatches } = await supabaseServer
    .from('matches')
    .select('*')
    .eq('tournament_id', tournament.id)
    .eq('stage', 'group');
  if (!groupMatches || groupMatches.length === 0) return;

  const allPlayed = groupMatches.every((m: Row) => m.score_a !== null && m.score_b !== null);
  if (!allPlayed) return;

  const groupLabels = Array.from(new Set(groupMatches.map((m: Row) => m.group_label))).sort() as string[];
  const groupsWithStandings = groupLabels.map((label) => {
    const fixtures = groupMatches
      .filter((m: Row) => m.group_label === label)
      .map((m: Row) => ({
        a: m.team_a_id,
        b: m.team_b_id,
        scoreA: String(m.score_a),
        scoreB: String(m.score_b),
      }));
    const teamIds = Array.from(new Set(fixtures.flatMap((f) => [f.a, f.b])));
    return { label, standings: computeStandings(teamIds, fixtures) };
  });

  const crossoverOrder = buildCrossoverOrder(groupsWithStandings, tournament.advance_per_group);
  const initialRounds = buildBracketRounds(crossoverOrder);
  const { rounds } = recomputeBracket(initialRounds);

  const rows = rounds.flatMap((round, roundIndex) =>
    round.map((m: any, matchIndex: number) => ({
      tournament_id: tournament.id,
      stage: 'bracket',
      round_index: roundIndex,
      match_day: null,
      match_index: matchIndex,
      team_a_id: m.a,
      team_b_id: m.b,
      winner_id: m.winner,
    }))
  );

  await supabaseServer.from('matches').insert(rows);
}
