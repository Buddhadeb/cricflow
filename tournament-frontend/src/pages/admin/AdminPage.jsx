import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { createTeam, getTeams } from '../../api/teams';
import { generateFixtures, listMatches } from '../../api/matches';
import PointsTable from '../../components/PointsTable';
import NavBar from '../../components/NavBar';

const getAdminStats = () => client.get('/admin/stats').then((r) => r.data);

const getPlayers = (params = {}) =>
  client.get('/players', { params }).then((r) => r.data);

const approvePlayer = (id) => client.patch(`/players/${id}/approve`).then((r) => r.data);
const rejectPlayer = (id) => client.patch(`/players/${id}/reject`).then((r) => r.data);

const getUsers = () => client.get('/admin/users').then((r) => r.data);
const updateRole = (id, role) => client.patch(`/admin/users/${id}/role`, { role }).then((r) => r.data);
const toggleActive = (id) => client.patch(`/admin/users/${id}/toggle-active`).then((r) => r.data);

const STATUS_COLOR = {
  registration: 'bg-emerald-100 text-emerald-700',
  auction:      'bg-amber-100 text-amber-700',
  league:       'bg-blue-100 text-blue-700',
  completed:    'bg-gray-100 text-gray-500',
};

function StatCard({ label, value, sub, color = 'text-slate-900' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    refetchInterval: 30_000,
  });

  if (isLoading) return <p className="text-gray-400 py-8 text-center">Loading…</p>;
  if (!data) return null;

  const { total_users, total_registrations, total_amount_collected, tournaments } = data;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Users on Platform"
          value={total_users.toLocaleString('en-IN')}
          sub="All registered accounts"
          color="text-slate-900"
        />
        <StatCard
          label="Total Player Registrations"
          value={total_registrations.toLocaleString('en-IN')}
          sub="Confirmed payments across all tournaments"
          color="text-blue-700"
        />
        <StatCard
          label="Total Revenue Collected"
          value={`₹${total_amount_collected.toLocaleString('en-IN')}`}
          sub="Sum of successful registration fees"
          color="text-emerald-600"
        />
      </div>

      {/* Per-tournament breakdown */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
          Tournament Breakdown
        </h3>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Tournament</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide text-right">Registrations</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide text-right">Amount Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tournaments.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-gray-900">{t.name}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLOR[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-blue-700">
                    {t.registrations}
                    <span className="text-gray-400 font-normal"> players</span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-emerald-600">
                    ₹{t.amount_collected.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={2} className="px-4 py-3 font-bold text-gray-700 text-sm">Total</td>
                <td className="px-4 py-3 text-right font-black text-blue-800">
                  {total_registrations}
                  <span className="text-gray-400 font-normal"> players</span>
                </td>
                <td className="px-4 py-3 text-right font-black text-emerald-700">
                  ₹{total_amount_collected.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const ROLES = ['admin', 'user'];
const ROLE_COLOR = {
  admin: 'bg-red-100 text-red-700',
  user:  'bg-gray-100 text-gray-600',
};

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'bg-white text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

function PlayersTab() {
  const qc = useQueryClient();
  const { data: players, isLoading } = useQuery({
    queryKey: ['admin-players'],
    queryFn: () => getPlayers(),
  });

  const approveMut = useMutation({
    mutationFn: approvePlayer,
    onSuccess: () => qc.invalidateQueries(['admin-players']),
  });
  const rejectMut = useMutation({
    mutationFn: rejectPlayer,
    onSuccess: () => qc.invalidateQueries(['admin-players']),
  });

  if (isLoading) return <p className="text-gray-400 py-8 text-center">Loading…</p>;

  const pending = players?.filter((p) => p.status === 'pending') ?? [];
  const others = players?.filter((p) => p.status !== 'pending') ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">
          Pending Approval ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-gray-400 text-sm">No pending players</p>
        ) : (
          <div className="space-y-2">
            {pending.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {p.photo_url ? (
                    <img
                      src={p.photo_url}
                      alt={p.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                      👤
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {p.player_type?.replace('_', ' ')} · Age {p.age}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMut.mutate(p.id)}
                    disabled={approveMut.isPending}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectMut.mutate(p.id)}
                    disabled={rejectMut.isPending}
                    className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {others.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">All Players ({others.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Base Price</th>
                </tr>
              </thead>
              <tbody>
                {others.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2.5 font-medium text-gray-800">{p.name}</td>
                    <td className="py-2.5 text-gray-500 capitalize">
                      {p.player_type?.replace('_', ' ')}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          p.status === 'available'
                            ? 'bg-blue-100 text-blue-700'
                            : p.status === 'sold'
                            ? 'bg-green-100 text-green-700'
                            : p.status === 'unsold'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-gray-700">
                      ₹{Number(p.base_price).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', owner_id: '', total_budget: '1000000' });
  const [error, setError] = useState('');

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => getTeams().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      qc.invalidateQueries(['teams']);
      setForm({ name: '', owner_id: '', total_budget: '1000000' });
      setError('');
    },
    onError: (e) => setError(e?.response?.data?.detail ?? 'Failed to create team'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    createMut.mutate({
      name: form.name.trim(),
      owner_id: form.owner_id.trim(),
      total_budget: Number(form.total_budget),
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Create Team</h3>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            required
            placeholder="Team name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            required
            placeholder="Owner user UUID"
            value={form.owner_id}
            onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="number"
            placeholder="Budget"
            value={form.total_budget}
            onChange={(e) => setForm({ ...form, total_budget: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button
          type="submit"
          disabled={createMut.isPending}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {createMut.isPending ? 'Creating…' : 'Create Team'}
        </button>
      </form>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading teams…</p>
      ) : (
        <div className="space-y-2">
          {(teams ?? []).map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between bg-white border rounded-xl px-4 py-3"
            >
              <div>
                <p className="font-medium text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-400 font-mono">{t.id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-green-600">
                  ₹{(t.remaining_budget / 100000).toFixed(1)}L remaining
                </p>
                <p className="text-xs text-gray-400">
                  of ₹{(t.total_budget / 100000).toFixed(1)}L
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchesTab() {
  const qc = useQueryClient();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: () => listMatches().then((r) => r.data),
  });

  const { data: pointsTable = [] } = useQuery({
    queryKey: ['points-table'],
    queryFn: () => client.get('/matches/points-table').then((r) => r.data),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => getTeams().then((r) => r.data),
  });
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));

  const genMut = useMutation({
    mutationFn: () => generateFixtures({ total_overs: 20 }),
    onSuccess: () => {
      qc.invalidateQueries(['matches']);
      qc.invalidateQueries(['points-table']);
    },
  });

  const STATUS_DOT = {
    scheduled: 'bg-blue-400',
    live: 'bg-green-500',
    completed: 'bg-gray-400',
    cancelled: 'bg-red-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">
          Fixtures ({matches.length} matches)
        </h3>
        <div className="flex gap-2">
          <Link
            to="/matches"
            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            Full Schedule →
          </Link>
          {matches.length === 0 && (
            <button
              onClick={() => genMut.mutate()}
              disabled={genMut.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {genMut.isPending ? 'Generating…' : 'Generate Fixtures'}
            </button>
          )}
        </div>
      </div>

      {genMut.isError && (
        <p className="text-red-500 text-sm">{genMut.error?.response?.data?.detail ?? 'Error'}</p>
      )}

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : matches.length === 0 ? (
        <p className="text-gray-400 text-sm">No fixtures yet. Click "Generate Fixtures" to create the round-robin schedule.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {matches.map((m) => (
            <Link
              key={m.id}
              to={`/matches/${m.id}`}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[m.status] ?? 'bg-gray-300'}`} />
                <span className="text-sm font-medium text-gray-800">
                  {teamMap[m.team_a_id]?.name ?? '?'} vs {teamMap[m.team_b_id]?.name ?? '?'}
                </span>
              </div>
              <span className="text-xs text-gray-400 capitalize">{m.status}</span>
            </Link>
          ))}
        </div>
      )}

      {pointsTable.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Points Table</h3>
          <PointsTable rows={pointsTable} />
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getUsers,
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }) => updateRole(id, role),
    onSuccess: () => qc.invalidateQueries(['admin-users']),
  });

  const activeMut = useMutation({
    mutationFn: (id) => toggleActive(id),
    onSuccess: () => qc.invalidateQueries(['admin-users']),
  });

  if (isLoading) return <p className="text-gray-400 py-8 text-center">Loading…</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{users.length} registered users</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500 text-xs">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Role</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-3 font-medium text-gray-800">{u.name}</td>
                <td className="py-3 text-gray-500 text-xs">{u.email}</td>
                <td className="py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_COLOR[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3">
                  <button
                    onClick={() => activeMut.mutate(u.id)}
                    disabled={activeMut.isPending}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                  >
                    {u.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="py-3">
                  <select
                    value={u.role}
                    onChange={(e) => roleMut.mutate({ id: u.id, role: e.target.value })}
                    disabled={roleMut.isPending}
                    className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 pt-6 pb-2">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Platform overview, player management, and settings</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-8 mt-4 space-y-5">
        <div className="flex gap-2 flex-wrap">
          <Tab label="Overview" active={tab === 'overview'} onClick={() => setTab('overview')} />
          <Tab label="Players" active={tab === 'players'} onClick={() => setTab('players')} />
          <Tab label="Teams" active={tab === 'teams'} onClick={() => setTab('teams')} />
          <Tab label="Matches" active={tab === 'matches'} onClick={() => setTab('matches')} />
          <Tab label="Users" active={tab === 'users'} onClick={() => setTab('users')} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {tab === 'overview' && <OverviewTab />}
          {tab === 'players' && <PlayersTab />}
          {tab === 'teams' && <TeamsTab />}
          {tab === 'matches' && <MatchesTab />}
          {tab === 'users' && <UsersTab />}
        </div>
      </div>
    </div>
  );
}
