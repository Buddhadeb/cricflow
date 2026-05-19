import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getTeamStats, getTopBatsmen, getTopBowlers } from '../api/stats';

const TABS = [
  { id: 'batsmen', label: 'Top Batsmen', icon: '🏏' },
  { id: 'bowlers', label: 'Top Bowlers', icon: '⚡' },
  { id: 'teams',   label: 'Teams',       icon: '🏆' },
];

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function PlayerAvatar({ name, photoUrl, color = 'from-blue-500 to-blue-700' }) {
  if (photoUrl) return <img src={photoUrl} alt={name} className="w-10 h-10 rounded-full object-cover shadow" />;
  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-black text-sm shadow`}>
      {name?.[0] ?? '?'}
    </div>
  );
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return <span className="text-sm font-bold text-gray-400 w-6 text-center">{rank}</span>;
}

function StatChip({ value, label, color = 'bg-gray-100 text-gray-700' }) {
  return (
    <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg ${color}`}>
      <span className="text-sm font-black leading-none">{value ?? '—'}</span>
      <span className="text-xs font-medium opacity-70 mt-0.5">{label}</span>
    </div>
  );
}

function BatsmenTab({ tournamentId }) {
  const { data: batsmen = [], isLoading } = useQuery({
    queryKey: ['top-batsmen', tournamentId],
    queryFn: () => getTopBatsmen(20, tournamentId).then((r) => r.data),
  });

  if (isLoading) return <Spinner />;
  if (batsmen.length === 0) return (
    <div className="text-center py-16">
      <span className="text-4xl">🏏</span>
      <p className="text-gray-400 mt-3 text-sm">No batting data yet. Start scoring matches!</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {batsmen.map((b, i) => (
        <Link
          key={b.player_id}
          to={`/stats/players/${b.player_id}`}
          className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-blue-50 rounded-2xl border border-transparent hover:border-blue-200 transition-all group"
        >
          <div className="w-8 flex justify-center shrink-0"><RankBadge rank={i + 1} /></div>
          <PlayerAvatar name={b.name} photoUrl={b.photo_url} color="from-blue-500 to-blue-700" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors truncate">{b.name}</p>
            <p className="text-xs text-gray-400 truncate">{b.team_name ?? 'Unassigned'}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <StatChip value={b.runs} label="Runs" color="bg-blue-100 text-blue-800" />
            <StatChip value={b.high_score} label="HS" color="bg-violet-100 text-violet-800" />
            <StatChip value={b.average} label="Avg" color="bg-emerald-100 text-emerald-800" />
            <StatChip value={b.strike_rate} label="SR" color="bg-amber-100 text-amber-800" />
            <StatChip value={b.sixes} label="6s" color="bg-purple-100 text-purple-800" />
          </div>
          <div className="sm:hidden flex items-center gap-2 shrink-0">
            <StatChip value={b.runs} label="Runs" color="bg-blue-100 text-blue-800" />
            <StatChip value={b.average} label="Avg" color="bg-emerald-100 text-emerald-800" />
          </div>
          <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ))}
    </div>
  );
}

function BowlersTab({ tournamentId }) {
  const { data: bowlers = [], isLoading } = useQuery({
    queryKey: ['top-bowlers', tournamentId],
    queryFn: () => getTopBowlers(20, tournamentId).then((r) => r.data),
  });

  if (isLoading) return <Spinner />;
  if (bowlers.length === 0) return (
    <div className="text-center py-16">
      <span className="text-4xl">⚡</span>
      <p className="text-gray-400 mt-3 text-sm">No bowling data yet. Start scoring matches!</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {bowlers.map((b, i) => (
        <Link
          key={b.player_id}
          to={`/stats/players/${b.player_id}`}
          className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-green-50 rounded-2xl border border-transparent hover:border-green-200 transition-all group"
        >
          <div className="w-8 flex justify-center shrink-0"><RankBadge rank={i + 1} /></div>
          <PlayerAvatar name={b.name} photoUrl={b.photo_url} color="from-emerald-500 to-emerald-700" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">{b.name}</p>
            <p className="text-xs text-gray-400 truncate">{b.team_name ?? 'Unassigned'}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <StatChip value={b.wickets} label="Wkts" color="bg-red-100 text-red-800" />
            <StatChip value={b.overs} label="Overs" color="bg-slate-100 text-slate-800" />
            <StatChip value={b.economy} label="Eco" color="bg-orange-100 text-orange-800" />
            <StatChip value={b.average ?? '—'} label="Avg" color="bg-emerald-100 text-emerald-800" />
            <StatChip value={b.maidens} label="Mdns" color="bg-violet-100 text-violet-800" />
          </div>
          <div className="sm:hidden flex items-center gap-2 shrink-0">
            <StatChip value={b.wickets} label="Wkts" color="bg-red-100 text-red-800" />
            <StatChip value={b.economy} label="Eco" color="bg-orange-100 text-orange-800" />
          </div>
          <svg className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ))}
    </div>
  );
}

function TeamsTab({ tournamentId }) {
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['team-stats', tournamentId],
    queryFn: () => getTeamStats(tournamentId).then((r) => r.data),
  });

  if (isLoading) return <Spinner />;
  if (teams.length === 0) return (
    <div className="text-center py-16">
      <span className="text-4xl">🏆</span>
      <p className="text-gray-400 mt-3 text-sm">No team data yet.</p>
    </div>
  );

  const RANK_COLORS = [
    'from-amber-400 to-amber-600',
    'from-slate-400 to-slate-600',
    'from-orange-400 to-orange-600',
  ];

  return (
    <div className="space-y-4">
      {teams.map((t, i) => {
        const budgetUsedPct = t.total_budget > 0 ? ((t.total_budget - t.remaining_budget) / t.total_budget) * 100 : 0;
        return (
          <div key={t.team_id} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 bg-white border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${RANK_COLORS[i] ?? 'from-slate-300 to-slate-500'} flex items-center justify-center text-white font-black text-sm shadow`}>
                  #{i + 1}
                </div>
                <div>
                  <p className="font-black text-gray-900 text-lg leading-tight">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.squad_size} players · ₹{(t.spent / 100000).toFixed(1)}L spent</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-blue-700">{t.matches.points}</p>
                <p className="text-xs text-gray-400 font-medium">points</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="text-emerald-600 font-bold">{t.matches.won}W</span>{' '}
                  <span className="text-red-400 font-bold">{t.matches.lost}L</span>{' '}
                  <span className="text-gray-400">{t.matches.tied}T</span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Batting</p>
                <p className="font-bold text-gray-900 text-base">
                  {t.batting.runs_scored}
                  <span className="text-xs text-gray-400 font-normal ml-1">/ {t.batting.wickets_lost} wkts</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Avg score: <span className="text-gray-600 font-semibold">{t.batting.average_score}</span></p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Bowling</p>
                <p className="font-bold text-gray-900 text-base">
                  {t.bowling.wickets_taken} wkts
                  <span className="text-xs text-gray-400 font-normal ml-1">/ {t.bowling.runs_conceded} runs</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Avg conceded: <span className="text-gray-600 font-semibold">{t.bowling.average_conceded}</span></p>
              </div>
            </div>
            <div className="px-4 pb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
                <span>Budget used</span>
                <span>₹{(t.remaining_budget / 100000).toFixed(1)}L of ₹{(t.total_budget / 100000).toFixed(1)}L left</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-500"
                  style={{ width: `${budgetUsedPct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TournamentStats({ tournamentId }) {
  const [tab, setTab] = useState('batsmen');

  return (
    <div className="space-y-5">
      <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
        {tab === 'batsmen' && <BatsmenTab tournamentId={tournamentId} />}
        {tab === 'bowlers' && <BowlersTab tournamentId={tournamentId} />}
        {tab === 'teams'   && <TeamsTab   tournamentId={tournamentId} />}
      </div>
    </div>
  );
}
