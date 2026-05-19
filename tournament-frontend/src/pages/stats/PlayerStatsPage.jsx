import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getPlayerStats } from '../../api/stats';
import NavBar from '../../components/NavBar';

const TYPE_CONFIG = {
  batsman: { color: 'bg-blue-100 text-blue-700', accent: 'from-blue-500 to-blue-700' },
  bowler: { color: 'bg-emerald-100 text-emerald-700', accent: 'from-emerald-500 to-emerald-700' },
  all_rounder: { color: 'bg-violet-100 text-violet-700', accent: 'from-violet-500 to-violet-700' },
  wicket_keeper: { color: 'bg-orange-100 text-orange-700', accent: 'from-orange-400 to-orange-600' },
};

function StatCard({ label, value, accent = false }) {
  return (
    <div className={`rounded-2xl p-4 text-center ${accent ? 'bg-gradient-to-br from-slate-900 to-blue-900 text-white' : 'bg-gray-50 border border-gray-100'}`}>
      <p className={`text-2xl font-black ${accent ? 'text-amber-400' : 'text-gray-900'}`}>{value ?? '—'}</p>
      <p className={`text-xs font-semibold uppercase tracking-wide mt-1 ${accent ? 'text-slate-400' : 'text-gray-400'}`}>{label}</p>
    </div>
  );
}

function SectionHeading({ icon, children }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-lg">{icon}</span>
      <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">{children}</h3>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

export default function PlayerStatsPage() {
  const { playerId } = useParams();

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['player-stats', playerId],
    queryFn: () => getPlayerStats(playerId).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-3xl mx-auto px-6 pt-16 text-center space-y-4">
          <span className="text-5xl">❓</span>
          <p className="text-gray-600 font-semibold text-lg">Player not found</p>
          <Link to="/stats" className="inline-block text-amber-600 text-sm font-bold hover:text-amber-500">← Back to Stats</Link>
        </div>
      </div>
    );
  }

  const typeCfg = TYPE_CONFIG[stats.player_type] ?? TYPE_CONFIG.batsman;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 flex items-center gap-3">
        <Link to="/stats" className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Stats
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-700 truncate">{stats.name}</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 mt-5 space-y-5">
        {/* Hero card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-6">
            <div className="flex items-center gap-5">
              {stats.photo_url ? (
                <img src={stats.photo_url} alt={stats.name} className="w-24 h-24 rounded-2xl object-cover shadow-xl ring-4 ring-white/10" />
              ) : (
                <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${typeCfg.accent} flex items-center justify-center text-white text-4xl font-black shadow-xl`}>
                  {stats.name[0]}
                </div>
              )}
              <div>
                <h2 className="text-3xl font-black text-white">{stats.name}</h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${typeCfg.color}`}>
                    {stats.player_type?.replace('_', ' ')}
                  </span>
                  {stats.team_name && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white">
                      {stats.team_name}
                    </span>
                  )}
                  <span className="text-slate-400 text-xs">Age {stats.age}</span>
                </div>
                <div className="flex gap-4 mt-3 text-sm">
                  <span className="text-slate-300"><span className="text-white font-bold">{stats.matches}</span> matches</span>
                  {stats.sold_price && (
                    <span className="text-emerald-400 font-bold">₹{Number(stats.sold_price).toLocaleString('en-IN')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Batting */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeading icon="🏏">Batting</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Innings" value={stats.batting.innings} accent />
            <StatCard label="Runs" value={stats.batting.runs} accent />
            <StatCard label="High Score" value={stats.batting.high_score} />
            <StatCard label="Average" value={stats.batting.average} />
            <StatCard label="Strike Rate" value={stats.batting.strike_rate} />
            <StatCard label="Fours" value={stats.batting.fours} />
            <StatCard label="Sixes" value={stats.batting.sixes} />
            <StatCard label="50s / 100s" value={`${stats.batting.fifties} / ${stats.batting.hundreds}`} />
          </div>
        </div>

        {/* Bowling */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeading icon="⚡">Bowling</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Innings" value={stats.bowling.innings} accent />
            <StatCard label="Wickets" value={stats.bowling.wickets} accent />
            <StatCard label="Overs" value={stats.bowling.overs} />
            <StatCard label="Runs" value={stats.bowling.runs} />
            <StatCard label="Economy" value={stats.bowling.economy} />
            <StatCard label="Average" value={stats.bowling.average} />
            <StatCard label="Maidens" value={stats.bowling.maidens} />
          </div>
        </div>

        {/* Fielding */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeading icon="🧤">Fielding</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Catches" value={stats.fielding.catches} />
            <StatCard label="Stumpings" value={stats.fielding.stumpings} />
          </div>
        </div>
      </div>
    </div>
  );
}
