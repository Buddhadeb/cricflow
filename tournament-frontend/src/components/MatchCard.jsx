import { Link } from 'react-router-dom';

const STATUS_DOT = {
  scheduled: 'bg-blue-400',
  live: 'bg-green-500 animate-pulse',
  completed: 'bg-gray-400',
  cancelled: 'bg-red-400',
};

export default function MatchCard({ match, teamA, teamB }) {
  const date = match.match_date
    ? new Date(match.match_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '—';

  return (
    <Link
      to={`/matches/${match.id}`}
      className="flex items-center justify-between bg-white border rounded-xl px-4 py-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[match.status] ?? 'bg-gray-300'}`} />
        <div>
          <p className="font-semibold text-gray-800 text-sm">
            {teamA?.name ?? '?'} vs {teamB?.name ?? '?'}
          </p>
          <p className="text-xs text-gray-400">{match.venue} · {date}</p>
        </div>
      </div>
      <div className="text-right">
        <span className="text-xs text-gray-500 capitalize">{match.status}</span>
        {match.result_summary && (
          <p className="text-xs text-green-600 font-medium truncate max-w-[120px]">{match.result_summary}</p>
        )}
      </div>
    </Link>
  );
}
