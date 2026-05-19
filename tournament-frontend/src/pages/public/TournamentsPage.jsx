import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import { getTournaments } from '../../api/tournaments';

const STATUS_CONFIG = {
  registration: { label: 'Registration Open', color: 'bg-emerald-100 text-emerald-700' },
  auction:      { label: 'Auction',            color: 'bg-amber-100 text-amber-700' },
  league:       { label: 'League',             color: 'bg-blue-100 text-blue-700' },
  playoffs:     { label: 'Playoffs',           color: 'bg-violet-100 text-violet-700' },
  completed:    { label: 'Completed',          color: 'bg-gray-100 text-gray-500' },
};

const FILTERS = ['all', 'registration', 'auction', 'league', 'playoffs', 'completed'];

function TournamentCard({ t }) {
  const cfg = STATUS_CONFIG[t.status] ?? { label: t.status, color: 'bg-gray-100 text-gray-500' };
  return (
    <Link
      to={`/tournaments/${t.id}`}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4"
    >
      {t.banner_url ? (
        <img src={t.banner_url} alt={t.name} className="w-full h-32 object-cover rounded-xl" />
      ) : (
        <div className="w-full h-32 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
          <span className="text-4xl">🏏</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-gray-900 text-lg group-hover:text-amber-600 transition-colors leading-tight">
          {t.name}
        </h3>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>
      {t.description && (
        <p className="text-sm text-gray-500 line-clamp-2">{t.description}</p>
      )}
      <div className="mt-auto grid grid-cols-3 gap-3 pt-4 border-t border-gray-50">
        <Stat label="Fee" value={`₹${t.registration_fee}`} />
        <Stat label="Teams" value={t.max_teams} />
        <Stat label="Overs" value={t.overs} />
      </div>
      {t.venue && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <span>📍</span> {t.venue}
        </p>
      )}
    </Link>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-base font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

export default function TournamentsPage() {
  const [filter, setFilter] = useState('all');
  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments', filter],
    queryFn: () => getTournaments(filter === 'all' ? null : filter),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900">Tournaments</h1>
          <p className="text-gray-500 mt-1">Find and join cricket tournaments near you</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-8">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors capitalize ${
                filter === f
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-slate-400'
              }`}
            >
              {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label ?? f}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">🏏</p>
            <p className="text-lg font-semibold">No tournaments found</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t) => (
              <TournamentCard key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
