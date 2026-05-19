import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import { getMyTeams, getTeamSquad, createTeam } from '../../api/teams';

const TYPE_COLOR = {
  batsman: 'bg-blue-100 text-blue-700',
  bowler: 'bg-emerald-100 text-emerald-700',
  all_rounder: 'bg-violet-100 text-violet-700',
  wicket_keeper: 'bg-orange-100 text-orange-700',
};

function CreateTeamForm({ onSuccess }) {
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('1000000');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createTeam({ name: name.trim(), total_budget: Number(budget) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-teams'] });
      onSuccess();
    },
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md mx-auto">
      <h2 className="text-lg font-bold text-gray-900 mb-6">Create Your Team</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Team Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mumbai Strikers"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Starting Budget (₹)</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        {mutation.isError && (
          <p className="text-red-600 text-sm">{mutation.error?.response?.data?.detail ?? 'Failed to create team'}</p>
        )}
        <button
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || mutation.isPending}
          className="w-full py-3 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Creating…' : 'Create Team'}
        </button>
      </div>
    </div>
  );
}

function TeamCard({ team }) {
  const { data: squad, isLoading } = useQuery({
    queryKey: ['squad', team.id],
    queryFn: () => getTeamSquad(team.id).then((r) => r.data),
  });

  const budgetUsedPct = team.total_budget > 0
    ? ((team.total_budget - team.remaining_budget) / team.total_budget) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Team hero */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">Your Team</p>
              <h2 className="text-3xl font-black text-white">{team.name}</h2>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white text-2xl font-black">
              {team.name[0]}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <div className="p-5 text-center">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Total Budget</p>
            <p className="text-xl font-black text-gray-900 mt-1">₹{(team.total_budget / 100000).toFixed(1)}L</p>
          </div>
          <div className="p-5 text-center">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Remaining</p>
            <p className="text-xl font-black text-emerald-600 mt-1">₹{(team.remaining_budget / 100000).toFixed(1)}L</p>
          </div>
          <div className="p-5 text-center">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Spent</p>
            <p className="text-xl font-black text-blue-700 mt-1">₹{((team.total_budget - team.remaining_budget) / 100000).toFixed(1)}L</p>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="flex justify-between text-xs text-gray-400 font-medium mb-1.5">
            <span>Budget utilised</span>
            <span>{budgetUsedPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-700"
              style={{ width: `${budgetUsedPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Squad */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="font-black text-gray-900 text-lg">My Squad</h3>
            <p className="text-xs text-gray-400 mt-0.5">{squad?.length ?? 0} players acquired</p>
          </div>
          <Link
            to={team.tournament_id ? `/auction?tournament_id=${team.tournament_id}` : '/auction'}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Live Auction
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !squad || squad.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl">🏏</span>
            <p className="text-gray-500 mt-3 font-medium">No players yet</p>
            <p className="text-gray-400 text-sm mt-1">Join the live auction to build your squad!</p>
            <Link to="/auction" className="inline-block mt-4 px-5 py-2.5 bg-amber-500 text-slate-900 rounded-xl text-sm font-bold hover:bg-amber-400 transition-colors">
              Go to Auction
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {squad.map((tp) => (
              <div key={tp.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                {tp.player?.photo_url ? (
                  <img src={tp.player.photo_url} alt={tp.player.name} className="w-10 h-10 rounded-full object-cover shadow" />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shadow ${
                    tp.player?.player_type === 'batsman' ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                    : tp.player?.player_type === 'bowler' ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                    : tp.player?.player_type === 'all_rounder' ? 'bg-gradient-to-br from-violet-500 to-violet-700'
                    : 'bg-gradient-to-br from-orange-400 to-orange-600'
                  }`}>
                    {(tp.player?.name ?? '?')[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{tp.player?.name ?? '—'}</p>
                  <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-md ${TYPE_COLOR[tp.player?.player_type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {tp.player?.player_type?.replace('_', ' ') ?? '—'}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-emerald-600">₹{Number(tp.sold_price).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-400">sold price</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OwnerDashboard() {
  const [creating, setCreating] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  const { data: myTeams = [], isLoading } = useQuery({
    queryKey: ['my-teams'],
    queryFn: getMyTeams,
  });

  const activeTeam = selectedTeamId
    ? myTeams.find((t) => t.id === selectedTeamId)
    : myTeams[0] ?? null;

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

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">My Team</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage your cricket squad</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2.5 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors text-sm"
          >
            + New Team
          </button>
        </div>

        {/* Team selector if multiple */}
        {myTeams.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {myTeams.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTeamId(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  activeTeam?.id === t.id ? 'bg-slate-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-slate-400'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        {creating && (
          <div className="mb-8">
            <CreateTeamForm onSuccess={() => setCreating(false)} />
          </div>
        )}

        {!creating && myTeams.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-5xl mb-4">🏏</p>
            <h2 className="text-lg font-bold text-gray-700">No team yet</h2>
            <p className="text-gray-400 mt-2 text-sm">Create a team to start bidding in auctions</p>
            <button
              onClick={() => setCreating(true)}
              className="mt-6 px-6 py-3 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors"
            >
              Create Team
            </button>
          </div>
        ) : activeTeam && !creating ? (
          <TeamCard team={activeTeam} />
        ) : null}
      </div>
    </div>
  );
}
