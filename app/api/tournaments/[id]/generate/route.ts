import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { buildBracketRounds, recomputeBracket, generateMatchDays } from '@/lib/tournamentLogic';

// POST /api/tournaments/:id/generate
// Builds the match schedule for a tournament from its (already saved) teams
// and format, then inserts it into `matches`. Called once by the organizer
// right after creation. Requires the Authorization: Bearer <access_token>
// header and ownership of the tournament.
//
// NOTE: Stripe isn't wired up yet, so this does not currently gate on
// tournament.status === 'paid' — it generates straight from 'draft' and
// marks the tournament 'active'. Add the payment check back in once
// checkout is in place.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const tournamentId = params.id;

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseServer.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  }

  const { data: tournament, error: tournamentError } = await supabaseServer
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (tournamentError || !tournament) {
    return NextResponse.json({ error: 'Tournament not found.' }, { status: 404 });
  }
  if (tournament.user_id !== userData.user.id) {
    return NextResponse.json({ error: 'Not your tournament.' }, { status: 403 });
  }

  const { count: existingMatches } = await supabaseServer
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);
  if (existingMatches && existingMatches > 0) {
    return NextResponse.json({ error: 'Matches already generated for this tournament.' }, { status: 400 });
  }

  const { data: teams, error: teamsError } = await supabaseServer
    .from('teams')
    .select('id, seed_order, group_label')
    .eq('tournament_id', tournamentId)
    .order('seed_order', { ascending: true });

  if (teamsError || !teams || teams.length < 2) {
    return NextResponse.json({ error: 'Not enough teams to generate a schedule.' }, { status: 400 });
  }

  const isDouble = tournament.leg_format === 'double';
  const rows: Record<string, unknown>[] = [];

  if (tournament.format === 'single') {
    const initialRounds = buildBracketRounds(teams.map((t) => t.id));
    const { rounds } = recomputeBracket(initialRounds);
    rounds.forEach((round, roundIndex) => {
      round.forEach((m: any, matchIndex: number) => {
        rows.push({
          tournament_id: tournamentId,
          stage: 'bracket',
          round_index: roundIndex,
          match_day: null,
          match_index: matchIndex,
          team_a_id: m.a,
          team_b_id: m.b,
          winner_id: m.winner,
        });
      });
    });
  } else if (tournament.format === 'round') {
    const matchDays = generateMatchDays(teams.map((t) => t.id), isDouble);
    matchDays.forEach((day, dayIndex) => {
      day.forEach((m: any, matchIndex: number) => {
        rows.push({
          tournament_id: tournamentId,
          stage: 'round_robin',
          round_index: null,
          match_day: dayIndex + 1,
          match_index: matchIndex,
          team_a_id: m.a,
          team_b_id: m.b,
        });
      });
    });
  } else if (tournament.format === 'groups') {
    const groupLabels = Array.from(new Set(teams.map((t) => t.group_label).filter(Boolean))).sort();
    if (groupLabels.length < 2) {
      return NextResponse.json({ error: 'Teams are missing group assignments.' }, { status: 400 });
    }
    groupLabels.forEach((label) => {
      const groupTeamIds = teams.filter((t) => t.group_label === label).map((t) => t.id);
      const matchDays = generateMatchDays(groupTeamIds, isDouble);
      matchDays.forEach((day, dayIndex) => {
        day.forEach((m: any, matchIndex: number) => {
          rows.push({
            tournament_id: tournamentId,
            stage: 'group',
            group_label: label,
            round_index: null,
            match_day: dayIndex + 1,
            match_index: matchIndex,
            team_a_id: m.a,
            team_b_id: m.b,
          });
        });
      });
    });
  } else {
    return NextResponse.json({ error: 'Unknown tournament format.' }, { status: 400 });
  }

  const { data: insertedMatches, error: matchesError } = await supabaseServer
    .from('matches')
    .insert(rows)
    .select();

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  await supabaseServer.from('tournaments').update({ status: 'active' }).eq('id', tournamentId);

  return NextResponse.json({ matches: insertedMatches });
}
