import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listMatches } from '../api/matches';
import { getTournamentTeams } from '../api/tournaments';

function formatDate(dt) {
  if (!dt) return { date: '—', time: '—' };
  const d = new Date(dt);
  return {
    date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
}

const STAGE_CONFIG = {
  league:        { label: 'League Stage',  color: 'bg-blue-100 text-blue-700' },
  quarter_final: { label: 'Quarter Finals', color: 'bg-violet-100 text-violet-700' },
  semi_final:    { label: 'Semi Finals',    color: 'bg-orange-100 text-orange-700' },
  final:         { label: 'Final',          color: 'bg-amber-100 text-amber-700' },
};

const STATUS_CONFIG = {
  scheduled: { label: 'Upcoming',   text: 'text-blue-600',  bg: 'bg-blue-50' },
  live:      { label: '● LIVE',     text: 'text-green-600', bg: 'bg-green-50 animate-pulse' },
  completed: { label: 'Completed',  text: 'text-gray-500',  bg: 'bg-gray-50' },
  cancelled: { label: 'Cancelled',  text: 'text-red-500',   bg: 'bg-red-50' },
};

function TeamAvatar({ name, logoUrl }) {
  if (logoUrl) return <img src={logoUrl} alt={name} className="w-10 h-10 rounded-full object-cover shadow" />;
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-black shadow">
      {name ? name[0] : '?'}
    </div>
  );
}

function MatchCard({ match, teamA, teamB }) {
  const status = STATUS_CONFIG[match.status] ?? STATUS_CONFIG.scheduled;
  const { date, time } = formatDate(match.match_date);
  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';

  return (
    <Link
      to={`/matches/${match.id}`}
      className={`block group bg-white rounded-2xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden ${
        isLive ? 'border-green-300 shadow-md shadow-green-100' : 'border-gray-100 shadow-sm'
      }`}
    >
      {isLive && <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-1" />}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {match.total_overs}T · {match.venue}
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <TeamAvatar name={teamA?.name} logoUrl={teamA?.logo_url} />
            <div>
              <p className={`font-bold text-gray-900 group-hover:text-blue-700 transition-colors leading-tight ${
                isCompleted && match.winner_id === teamA?.id ? 'text-emerald-700' : ''
              }`}>
                {teamA?.name ?? 'TBD'}
              </p>
              {isCompleted && match.winner_id === teamA?.id && (
                <span className="text-xs text-emerald-600 font-semibold">Winner 🏆</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <span className="text-xs font-black text-gray-300 uppercase tracking-widest">vs</span>
            {isLive && <span className="mt-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
          </div>

          <div className="flex items-center gap-3 flex-1 flex-row-reverse">
            <TeamAvatar name={teamB?.name} logoUrl={teamB?.logo_url} />
            <div className="text-right">
              <p className={`font-bold text-gray-900 group-hover:text-blue-700 transition-colors leading-tight ${
                isCompleted && match.winner_id === teamB?.id ? 'text-emerald-700' : ''
              }`}>
                {teamB?.name ?? 'TBD'}
              </p>
              {isCompleted && match.winner_id === teamB?.id && (
                <span className="text-xs text-emerald-600 font-semibold">Winner 🏆</span>
              )}
            </div>
          </div>
        </div>

        {match.result_summary && (
          <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5 font-medium text-center border border-emerald-100">
            {match.result_summary}
          </p>
        )}

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-gray-500 font-medium">{date}</span>
          <span className="text-gray-300">·</span>
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-gray-500 font-medium">{time}</span>
        </div>
      </div>
    </Link>
  );
}

export default function MatchSchedule({ tournamentId }) {
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['matches', tournamentId],
    queryFn: () => listMatches(tournamentId ? { tournament_id: tournamentId } : undefined).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['tournament-teams', tournamentId],
    queryFn: () => getTournamentTeams(tournamentId),
    enabled: !!tournamentId,
  });

  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));

  const grouped = matches.reduce((acc, m) => {
    const stage = m.stage ?? 'league';
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(m);
    return acc;
  }, {});

  const stageOrder = ['league', 'quarter_final', 'semi_final', 'final'];
  const liveCount = matches.filter((m) => m.status === 'live').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Loading fixtures…</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🏏</span>
        </div>
        <h2 className="text-lg font-bold text-gray-700">No fixtures yet</h2>
        <p className="text-gray-400 mt-1 text-sm">Fixtures will appear here once the tournament begins.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {liveCount > 0 && (
        <div className="flex items-center gap-2 bg-green-500 text-white px-3.5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-green-200 animate-pulse w-fit">
          <span className="w-2 h-2 bg-white rounded-full" />
          {liveCount} Live {liveCount === 1 ? 'Match' : 'Matches'}
        </div>
      )}
      {stageOrder
        .filter((s) => grouped[s]?.length)
        .map((stage) => {
          const cfg = STAGE_CONFIG[stage] ?? { label: stage, color: 'bg-gray-100 text-gray-600' };
          return (
            <section key={stage}>
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                <span className="text-xs text-gray-400 font-medium">
                  {grouped[stage].length} match{grouped[stage].length !== 1 ? 'es' : ''}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {grouped[stage].map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    teamA={teamMap[match.team_a_id]}
                    teamB={teamMap[match.team_b_id]}
                  />
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}
