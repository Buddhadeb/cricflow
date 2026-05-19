import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

const getPointsTable = (tournamentId) =>
  client.get('/matches/points-table', { params: { tournament_id: tournamentId } }).then((r) => r.data);

const RANK_CONFIG = [
  { icon: '🥇', bg: 'bg-amber-50', border: 'border-l-4 border-l-amber-400' },
  { icon: '🥈', bg: 'bg-slate-50',  border: 'border-l-4 border-l-slate-400' },
  { icon: '🥉', bg: 'bg-orange-50', border: 'border-l-4 border-l-orange-400' },
];

export default function PointsTable({ tournamentId }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['points-table', tournamentId],
    queryFn: () => getPointsTable(tournamentId),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📊</span>
        </div>
        <h2 className="text-lg font-bold text-gray-700">No results yet</h2>
        <p className="text-gray-400 mt-1 text-sm">Points table will populate once matches are completed.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-slate-900 px-5 py-4 grid grid-cols-12 gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Team</div>
        <div className="col-span-1 text-center">P</div>
        <div className="col-span-1 text-center">W</div>
        <div className="col-span-1 text-center">L</div>
        <div className="col-span-1 text-center">NR</div>
        <div className="col-span-2 text-center">Pts</div>
      </div>

      {rows.map((row, i) => {
        const rank = RANK_CONFIG[i];
        return (
          <div
            key={row.team_id}
            className={`grid grid-cols-12 gap-2 px-5 py-4 items-center border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${rank?.bg ?? ''} ${rank?.border ?? ''}`}
          >
            <div className="col-span-1">
              {rank ? (
                <span className="text-lg">{rank.icon}</span>
              ) : (
                <span className="text-sm font-bold text-gray-400">{i + 1}</span>
              )}
            </div>
            <div className="col-span-5 flex items-center gap-3">
              {row.logo_url ? (
                <img src={row.logo_url} alt={row.name} className="w-8 h-8 rounded-full shadow-sm object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-black shadow">
                  {row.name[0]}
                </div>
              )}
              <span className="font-bold text-gray-900 text-sm">{row.name}</span>
            </div>
            <div className="col-span-1 text-center text-sm text-gray-500 font-medium">{row.played}</div>
            <div className="col-span-1 text-center text-sm font-bold text-emerald-600">{row.won}</div>
            <div className="col-span-1 text-center text-sm font-medium text-red-400">{row.lost}</div>
            <div className="col-span-1 text-center text-sm text-gray-400">{row.no_result}</div>
            <div className="col-span-2 flex justify-center">
              <span className={`inline-flex items-center justify-center w-10 h-8 rounded-lg text-sm font-black shadow-sm ${
                i === 0 ? 'bg-amber-400 text-slate-900' : i < 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}>
                {row.points}
              </span>
            </div>
          </div>
        );
      })}

      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-5 text-xs text-gray-400 font-medium">
        <span>P = Played</span>
        <span>W = Won</span>
        <span>L = Lost</span>
        <span>NR = No Result</span>
        <span>Pts = Points</span>
      </div>
    </div>
  );
}
