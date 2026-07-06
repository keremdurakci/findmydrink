import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// POST /api/tournaments
// Creates a tournament (as a draft, unpaid) along with its teams.
// Expects an Authorization: Bearer <access_token> header from the
// logged-in organizer (Supabase Auth session).
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseServer.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  }
  const userId = userData.user.id;

  const body = await request.json();
  const {
    name, sport, format, legFormat, startDate, endDate, location,
    seeding, groupCount, advancePerGroup, teams,
  } = body;

  if (!name || !format || !Array.isArray(teams) || teams.length < 2) {
    return NextResponse.json({ error: 'Missing required tournament details.' }, { status: 400 });
  }

  const { data: tournament, error: tournamentError } = await supabaseServer
    .from('tournaments')
    .insert({
      user_id: userId,
      name,
      sport: sport || 'Soccer',
      format,
      leg_format: legFormat || 'single',
      start_date: startDate || null,
      end_date: endDate || null,
      location: location || null,
      seeding: seeding || 'random',
      group_count: groupCount || null,
      advance_per_group: advancePerGroup || null,
      status: 'draft',
    })
    .select()
    .single();

  if (tournamentError) {
    return NextResponse.json({ error: tournamentError.message }, { status: 500 });
  }

  const teamRows = teams.map((t, i) => ({
    tournament_id: tournament.id,
    name: t.name,
    color_a: t.colorA || '#2F6F5E',
    color_b: t.colorB || '#FFB627',
    logo_type: t.logoType || 'preset',
    logo_index: t.logoIndex ?? 0,
    logo_data: t.logoType === 'upload' ? t.logoData : null,
    seed_order: i,
    group_label: t.groupLabel || null,
  }));

  const { data: insertedTeams, error: teamsError } = await supabaseServer
    .from('teams')
    .insert(teamRows)
    .select();

  if (teamsError) {
    // Roll back the tournament row so we don't leave an orphaned draft behind.
    await supabaseServer.from('tournaments').delete().eq('id', tournament.id);
    return NextResponse.json({ error: teamsError.message }, { status: 500 });
  }

  return NextResponse.json({
    tournamentId: tournament.id,
    shareSlug: tournament.share_slug,
    teams: insertedTeams,
  });
}
