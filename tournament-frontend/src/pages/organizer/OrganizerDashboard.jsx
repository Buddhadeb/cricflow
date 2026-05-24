import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import {
  getMyTournaments,
  createTournament,
  updateTournament,
  getTournamentPlayers,
  getTournamentTeams,
  approvePayment,
  rejectPlayer,
  startAuction,
  startLeague,
  completeTournament,
  createTournamentTeam,
  assignTeamOwner,
  generateTournamentFixtures,
  scheduleTournamentMatch,
} from '../../api/tournaments';
import { listMatches } from '../../api/matches';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = {
  registration: { label: 'Registration',  color: 'bg-emerald-100 text-emerald-700' },
  auction:      { label: 'Auction',        color: 'bg-amber-100 text-amber-700' },
  league:       { label: 'League',         color: 'bg-blue-100 text-blue-700' },
  playoffs:     { label: 'Playoffs',       color: 'bg-violet-100 text-violet-700' },
  completed:    { label: 'Completed',      color: 'bg-gray-100 text-gray-500' },
};

const TYPE_COLORS = {
  batsman: 'bg-blue-50 text-blue-700',
  bowler: 'bg-red-50 text-red-700',
  all_rounder: 'bg-violet-50 text-violet-700',
  wicket_keeper: 'bg-orange-50 text-orange-700',
};

// Convert ISO datetime string → "YYYY-MM-DDThh:mm" for datetime-local inputs
function toLocalInput(iso) {
  if (!iso) return '';
  return iso.slice(0, 16);
}

function TournamentForm({ onSuccess, initial }) {
  const defaults = initial
    ? {
        ...initial,
        start_date: toLocalInput(initial.start_date),
        end_date: toLocalInput(initial.end_date),
        registration_start_date: toLocalInput(initial.registration_start_date),
        registration_end_date: toLocalInput(initial.registration_end_date),
        auction_date: toLocalInput(initial.auction_date),
      }
    : { registration_fee: 150, max_teams: 8, overs: 20, max_squad_size: 15, is_public: true };

  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: defaults });
  const qc = useQueryClient();
  const isEdit = !!initial;

  const mutation = useMutation({
    mutationFn: (data) => {
      const clean = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [
          k,
          v === '' || (typeof v === 'number' && isNaN(v)) ? null : v,
        ])
      );
      return isEdit ? updateTournament(initial.id, clean) : createTournament(clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-tournaments'] });
      onSuccess();
    },
  });

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      <Field label="Tournament Name" error={errors.name?.message}>
        <input {...register('name', { required: 'Name required' })} className={inputCls} />
      </Field>
      <Field label="Description">
        <textarea {...register('description')} rows={3} className={`${inputCls} resize-none`} />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Registration Fee (₹)">
          <input type="number" {...register('registration_fee', { valueAsNumber: true })} className={inputCls} />
        </Field>
        <Field label="Max Teams">
          <input type="number" {...register('max_teams', { valueAsNumber: true })} className={inputCls} />
        </Field>
        <Field label="Overs">
          <input type="number" {...register('overs', { valueAsNumber: true })} className={inputCls} />
        </Field>
      </div>

      <Field label="Venue">
        <input {...register('venue')} className={inputCls} />
      </Field>

      {/* Match dates */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Match Schedule</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Match Start Date">
            <input type="datetime-local" {...register('start_date')} className={inputCls} />
          </Field>
          <Field label="Match End Date">
            <input type="datetime-local" {...register('end_date')} className={inputCls} />
          </Field>
        </div>
      </div>

      {/* Registration window */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Registration Window</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Registration Opens">
            <input type="datetime-local" {...register('registration_start_date')} className={inputCls} />
          </Field>
          <Field label="Registration Closes">
            <input type="datetime-local" {...register('registration_end_date')} className={inputCls} />
          </Field>
        </div>
      </div>

      {/* Auction date */}
      <Field label="Auction Date">
        <input type="datetime-local" {...register('auction_date')} className={inputCls} />
      </Field>

      {/* Auction pricing */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Auction Pricing</p>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Player Base Price (₹)">
            <input type="number" step="0.01" {...register('player_base_price', { valueAsNumber: true })} placeholder="e.g. 50000" className={inputCls} />
          </Field>
          <Field label="Player Upper Price (₹)">
            <input type="number" step="0.01" {...register('player_upper_price', { valueAsNumber: true })} placeholder="e.g. 500000" className={inputCls} />
          </Field>
          <Field label="Team Budget Limit (₹)">
            <input type="number" step="0.01" {...register('team_budget_limit', { valueAsNumber: true })} placeholder="e.g. 1000000" className={inputCls} />
          </Field>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Base price = minimum starting bid per player. Upper price = max a player can be sold for. Budget limit = max total spend per team.</p>
      </div>

      {/* Payment contact */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Payment & Contact</p>
        <p className="text-xs text-gray-400 mb-3">Players will see this on the payment page so they know where to pay you.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Your UPI ID">
            <input {...register('upi_id')} placeholder="yourname@upi" className={inputCls} />
          </Field>
          <Field label="Contact Phone">
            <input {...register('contact_phone')} placeholder="+91 98765 43210" className={inputCls} />
          </Field>
        </div>
      </div>

      {/* Squad size */}
      <Field label="Max Squad Size per Team">
        <input type="number" {...register('max_squad_size', { valueAsNumber: true })} placeholder="15" min={11} max={25} className={inputCls} />
      </Field>

      <div className="flex items-center gap-2 pt-1">
        <input type="checkbox" id="is_public" {...register('is_public')} className="accent-amber-500" />
        <label htmlFor="is_public" className="text-sm text-gray-700">Make this tournament public</label>
      </div>

      {mutation.isError && (
        <p className="text-red-600 text-sm">
          {typeof mutation.error?.response?.data?.detail === 'string'
            ? mutation.error.response.data.detail
            : mutation.error?.message ?? 'Failed to save'}
        </p>
      )}
      <button type="submit" disabled={mutation.isPending}
        className="w-full py-2.5 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-50">
        {mutation.isPending ? 'Saving…' : isEdit ? 'Update Tournament' : 'Create Tournament'}
      </button>
    </form>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function PlayersTab({ tournament }) {
  const qc = useQueryClient();
  const { data: players = [], isLoading } = useQuery({
    queryKey: ['tournament-players', tournament.id],
    queryFn: () => getTournamentPlayers(tournament.id),
  });

  const approveMutation = useMutation({
    mutationFn: (pid) => approvePayment(pid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament-players', tournament.id] }),
  });
  const rejectMutation = useMutation({
    mutationFn: (pid) => rejectPlayer(tournament.id, pid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament-players', tournament.id] }),
  });

  if (isLoading) return <div className="py-8 flex justify-center"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;

  // Tournament base price overrides individual player prices for the auction
  const effectiveBase = tournament.player_base_price ? Number(tournament.player_base_price) : null;

  const pending = players.filter((p) => p.status === 'pending');
  const approved = players.filter((p) => p.status !== 'pending');

  function BasePrice({ playerBase }) {
    const display = effectiveBase ?? playerBase;
    return (
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-gray-800">₹{display.toLocaleString('en-IN')}</p>
        {effectiveBase && effectiveBase !== playerBase && (
          <p className="text-xs text-gray-400 line-through">₹{playerBase.toLocaleString('en-IN')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {effectiveBase && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 font-medium">
          <span>ℹ️</span>
          <span>All players start at tournament base price <strong>₹{effectiveBase.toLocaleString('en-IN')}</strong>. Individual declared prices are shown struck-through.</span>
        </div>
      )}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">Pending Approval ({pending.length})</h3>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
                  {p.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TYPE_COLORS[p.player_type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.player_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">Fee</p>
                  <p className="text-sm font-bold text-amber-600">₹{Number(tournament.registration_fee).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveMutation.mutate(p.id)} disabled={approveMutation.isPending}
                    className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">
                    Approve Payment
                  </button>
                  <button
                    onClick={() => { if (window.confirm(`Reject ${p.name}?`)) rejectMutation.mutate(p.id); }}
                    disabled={rejectMutation.isPending}
                    className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {approved.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">Approved Players ({approved.length})</h3>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {approved.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                  {p.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TYPE_COLORS[p.player_type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.player_type.replace('_', ' ')}
                  </span>
                </div>
                <BasePrice playerBase={p.base_price} />
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.status === 'available' ? 'bg-emerald-100 text-emerald-700' : p.status === 'sold' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {players.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🏏</p>
          <p>No players registered yet</p>
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, tournament, onRefresh }) {
  const [assigning, setAssigning] = useState(false);
  const [email, setEmail] = useState('');
  const [assignError, setAssignError] = useState('');

  const assignMutation = useMutation({
    mutationFn: () => assignTeamOwner(tournament.id, team.id, email.trim()),
    onSuccess: () => {
      setAssigning(false);
      setEmail('');
      setAssignError('');
      onRefresh();
    },
    onError: (e) => setAssignError(e?.response?.data?.detail ?? 'User not found'),
  });

  const spent = team.total_budget - team.remaining_budget;
  const pct = team.total_budget > 0 ? (spent / team.total_budget) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-blue-900 flex items-center justify-center text-white font-black text-base shrink-0">
          {team.name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 truncate">{team.name}</p>
          {team.owner_name ? (
            <p className="text-xs text-gray-500 truncate">{team.owner_name} · {team.owner_email}</p>
          ) : (
            <button
              onClick={() => { setAssigning(true); setAssignError(''); }}
              className="text-xs text-amber-600 font-semibold hover:underline"
            >
              + Assign owner
            </button>
          )}
        </div>
        {team.owner_name && (
          <button
            onClick={() => { setAssigning(true); setAssignError(''); setEmail(''); }}
            className="text-xs text-gray-400 hover:text-amber-600 shrink-0"
            title="Change owner"
          >
            ✏️
          </button>
        )}
      </div>

      {assigning && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            {team.owner_name ? 'Change owner' : 'Assign owner'} — enter their account email
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setAssignError(''); }}
              placeholder="owner@example.com"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              onKeyDown={(e) => e.key === 'Enter' && email.trim() && assignMutation.mutate()}
            />
            <button
              onClick={() => assignMutation.mutate()}
              disabled={!email.trim() || assignMutation.isPending}
              className="px-3 py-1.5 bg-amber-400 text-slate-900 text-xs font-bold rounded-lg hover:bg-amber-300 disabled:opacity-50 transition-colors"
            >
              {assignMutation.isPending ? '…' : 'Save'}
            </button>
            <button
              onClick={() => { setAssigning(false); setEmail(''); setAssignError(''); }}
              className="px-3 py-1.5 text-gray-400 hover:text-gray-600 text-xs"
            >
              Cancel
            </button>
          </div>
          {assignError && <p className="text-red-600 text-xs mt-1.5">{assignError}</p>}
        </div>
      )}

      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Budget used</span>
        <span className="font-semibold text-gray-600">₹{spent.toLocaleString('en-IN')} / ₹{team.total_budget.toLocaleString('en-IN')}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TeamsTab({ tournament }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['tournament-teams', tournament.id],
    queryFn: () => getTournamentTeams(tournament.id),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const payload = { name: data.name, owner_email: data.owner_email || null };
      if (data.total_budget) payload.total_budget = Number(data.total_budget);
      return createTournamentTeam(tournament.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tournament-teams', tournament.id] });
      qc.invalidateQueries({ queryKey: ['my-tournaments'] });
      reset();
      setShowForm(false);
    },
  });

  if (isLoading) return <div className="py-8 flex justify-center"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

  return (
    <div className="space-y-4">
      {/* Create team form */}
      {showForm ? (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Add Team</h3>
            <button onClick={() => { setShowForm(false); reset(); }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-3">
            <Field label="Team Name" error={errors.name?.message}>
              <input {...register('name', { required: 'Team name required' })} placeholder="e.g. Mumbai Strikers" className={inputCls} />
            </Field>
            <Field label="Owner Email (optional)">
              <input type="email" {...register('owner_email')} placeholder="owner@example.com" className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">User must already have an account. Leave blank to assign later.</p>
            </Field>
            <Field label={`Team Budget (₹)${tournament.team_budget_limit ? ` — limit ₹${Number(tournament.team_budget_limit).toLocaleString('en-IN')}` : ''}`}>
              <input type="number" step="0.01" {...register('total_budget')}
                placeholder={tournament.team_budget_limit ? Number(tournament.team_budget_limit).toString() : '1000000'}
                className={inputCls} />
            </Field>
            {createMutation.isError && (
              <p className="text-red-600 text-sm">{createMutation.error?.response?.data?.detail ?? 'Failed to create team'}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={createMutation.isPending}
                className="flex-1 py-2 bg-amber-400 text-slate-900 font-bold rounded-lg hover:bg-amber-300 transition-colors disabled:opacity-50 text-sm">
                {createMutation.isPending ? 'Creating…' : 'Create Team'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); reset(); }}
                className="px-4 py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-semibold text-gray-400 hover:border-amber-400 hover:text-amber-600 transition-colors">
          + Add Team
        </button>
      )}

      {/* Teams list */}
      {teams.length === 0 && !showForm ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🏆</p>
          <p>No teams yet — add the first one above</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {teams.map((t) => (
            <TeamCard
              key={t.id}
              team={t}
              tournament={tournament}
              onRefresh={() => {
                qc.invalidateQueries({ queryKey: ['tournament-teams', tournament.id] });
                qc.invalidateQueries({ queryKey: ['my-tournaments'] });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const STAGE_OPTIONS = [
  { value: 'league', label: 'League' },
  { value: 'quarter_final', label: 'Quarter Final' },
  { value: 'semi_final', label: 'Semi Final' },
  { value: 'final', label: 'Final' },
];

const MATCH_STATUS_STYLE = {
  scheduled: 'bg-blue-50 text-blue-700',
  live:      'bg-green-50 text-green-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-50 text-red-500',
};

function MatchesTab({ tournament }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [genError, setGenError] = useState(null);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['matches', tournament.id],
    queryFn: () => listMatches({ tournament_id: tournament.id }).then((r) => r.data),
    refetchInterval: 15_000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['tournament-teams', tournament.id],
    queryFn: () => getTournamentTeams(tournament.id),
  });

  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));

  const generateMut = useMutation({
    mutationFn: () => generateTournamentFixtures(tournament.id, { total_overs: tournament.overs }),
    onSuccess: () => { setGenError(null); qc.invalidateQueries({ queryKey: ['matches', tournament.id] }); },
    onError: (e) => setGenError(e?.response?.data?.detail ?? 'Failed to generate fixtures'),
  });

  const scheduleMut = useMutation({
    mutationFn: (data) => scheduleTournamentMatch(tournament.id, {
      team_a_id: data.team_a_id,
      team_b_id: data.team_b_id,
      venue: data.venue || null,
      match_date: data.match_date || null,
      stage: data.stage,
      total_overs: data.total_overs ? Number(data.total_overs) : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['matches', tournament.id] }); reset(); setShowForm(false); },
  });

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';
  const teamA = watch('team_a_id');

  const grouped = matches.reduce((acc, m) => {
    const s = m.stage ?? 'league';
    if (!acc[s]) acc[s] = [];
    acc[s].push(m);
    return acc;
  }, {});
  const stageOrder = ['league', 'quarter_final', 'semi_final', 'final'];
  const stageLabelMap = { league: 'League', quarter_final: 'Quarter Finals', semi_final: 'Semi Finals', final: 'Final' };

  if (isLoading) return <div className="py-8 flex justify-center"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {matches.length === 0 && (
          <button
            onClick={() => {
              if (!window.confirm(`Generate all round-robin fixtures for ${teams.length} teams? This will create ${(teams.length * (teams.length - 1)) / 2} matches and cannot be undone.`)) return;
              setGenError(null);
              generateMut.mutate();
            }}
            disabled={generateMut.isPending || teams.length < 2}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {generateMut.isPending && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            ⚡ Generate All Fixtures
          </button>
        )}
        <button
          onClick={() => { setShowForm((v) => !v); reset(); }}
          className="px-4 py-2 bg-amber-400 text-slate-900 text-sm font-bold rounded-xl hover:bg-amber-300 transition-colors"
        >
          {showForm ? '✕ Cancel' : '+ Add Match'}
        </button>
        {genError && <p className="text-red-600 text-xs font-medium">⚠️ {genError}</p>}
        {teams.length < 2 && <p className="text-xs text-gray-400">Add at least 2 teams first to generate fixtures.</p>}
      </div>

      {/* Add Match form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Schedule a Match</h3>
          <form onSubmit={handleSubmit((d) => scheduleMut.mutate(d))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Team A" error={errors.team_a_id?.message}>
                <select {...register('team_a_id', { required: 'Select Team A' })} className={inputCls}>
                  <option value="">— Select —</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Team B" error={errors.team_b_id?.message}>
                <select {...register('team_b_id', { required: 'Select Team B' })} className={inputCls}>
                  <option value="">— Select —</option>
                  {teams.filter((t) => t.id !== teamA).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stage">
                <select {...register('stage')} className={inputCls}>
                  {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Overs">
                <input type="number" {...register('total_overs')} placeholder={tournament.overs} className={inputCls} />
              </Field>
            </div>
            <Field label="Date & Time">
              <input type="datetime-local" {...register('match_date')} className={inputCls} />
            </Field>
            <Field label="Venue">
              <input {...register('venue')} placeholder={tournament.venue || 'e.g. Stadium A'} className={inputCls} />
            </Field>
            {scheduleMut.isError && (
              <p className="text-red-600 text-sm">{scheduleMut.error?.response?.data?.detail ?? 'Failed to schedule'}</p>
            )}
            <button type="submit" disabled={scheduleMut.isPending}
              className="w-full py-2.5 bg-amber-400 text-slate-900 font-bold rounded-lg hover:bg-amber-300 transition-colors disabled:opacity-50 text-sm">
              {scheduleMut.isPending ? 'Saving…' : 'Schedule Match'}
            </button>
          </form>
        </div>
      )}

      {/* Match list */}
      {matches.length === 0 && !showForm ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">🏏</p>
          <p className="font-semibold text-gray-600">No matches yet</p>
          <p className="text-sm mt-1">Generate all fixtures at once or add matches individually.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {stageOrder.filter((s) => grouped[s]?.length).map((stage) => (
            <section key={stage}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stageLabelMap[stage]}</span>
                <span className="text-xs text-gray-400">{grouped[stage].length} match{grouped[stage].length !== 1 ? 'es' : ''}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-2">
                {grouped[stage].map((m) => {
                  const tA = teamMap[m.team_a_id];
                  const tB = teamMap[m.team_b_id];
                  const statusStyle = MATCH_STATUS_STYLE[m.status] ?? 'bg-gray-100 text-gray-500';
                  const matchDate = m.match_date ? new Date(m.match_date) : null;
                  return (
                    <div key={m.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <span className="font-bold text-gray-900 text-sm truncate">{tA?.name ?? '—'}</span>
                        <span className="text-xs text-gray-300 font-black shrink-0">vs</span>
                        <span className="font-bold text-gray-900 text-sm truncate">{tB?.name ?? '—'}</span>
                      </div>
                      <div className="hidden sm:flex flex-col items-end text-xs text-gray-400 shrink-0">
                        {matchDate && <span>{matchDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                        {m.venue && <span className="truncate max-w-[120px]">{m.venue}</span>}
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${statusStyle}`}>
                        {m.status === 'live' ? '● LIVE' : m.status}
                      </span>
                      <Link to={`/matches/${m.id}`} className="text-xs text-blue-600 hover:underline shrink-0 font-semibold">
                        View →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentDetail({ tournament }) {
  const [tab, setTab] = useState('players');
  const qc = useQueryClient();

  const [phaseError, setPhaseError] = useState(null);
  const phaseAction = useMutation({
    mutationFn: (action) => {
      if (action === 'auction') return startAuction(tournament.id);
      if (action === 'league') return startLeague(tournament.id);
      if (action === 'complete') return completeTournament(tournament.id);
    },
    onSuccess: () => { setPhaseError(null); qc.invalidateQueries({ queryKey: ['my-tournaments'] }); },
    onError: (e) => setPhaseError(e?.response?.data?.detail ?? e?.message ?? 'Action failed'),
  });

  const confirmPhase = (action, label) => {
    if (!window.confirm(`Move tournament to ${label} phase? This cannot be undone.`)) return;
    setPhaseError(null);
    phaseAction.mutate(action);
  };

  const cfg = STATUS_CONFIG[tournament.status] ?? { label: tournament.status, color: 'bg-gray-100 text-gray-500' };

  return (
    <div>
      {/* Tournament card header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900">{tournament.name}</h2>
            {tournament.venue && <p className="text-sm text-gray-500 mt-0.5">📍 {tournament.venue}</p>}
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-50">
          <Stat label="Fee" value={`₹${tournament.registration_fee}`} />
          <Stat label="Teams" value={tournament.max_teams} />
          <Stat label="Overs" value={tournament.overs} />
        </div>

        {/* Dates & pricing summary */}
        <div className="mt-4 pt-4 border-t border-gray-50 space-y-2 text-sm text-gray-600">
          {tournament.registration_start_date && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-36 shrink-0">Registration</span>
              <span>{new Date(tournament.registration_start_date).toLocaleDateString()} – {tournament.registration_end_date ? new Date(tournament.registration_end_date).toLocaleDateString() : '?'}</span>
            </div>
          )}
          {tournament.auction_date && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-36 shrink-0">Auction Date</span>
              <span>{new Date(tournament.auction_date).toLocaleString()}</span>
            </div>
          )}
          {tournament.start_date && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-36 shrink-0">Match Dates</span>
              <span>{new Date(tournament.start_date).toLocaleDateString()} – {tournament.end_date ? new Date(tournament.end_date).toLocaleDateString() : '?'}</span>
            </div>
          )}
          {(tournament.player_base_price || tournament.player_upper_price || tournament.team_budget_limit) && (
            <div className="flex items-center gap-4 flex-wrap">
              {tournament.player_base_price && <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded-lg">Base ₹{Number(tournament.player_base_price).toLocaleString('en-IN')}</span>}
              {tournament.player_upper_price && <span className="bg-violet-50 text-violet-700 text-xs font-semibold px-2 py-1 rounded-lg">Cap ₹{Number(tournament.player_upper_price).toLocaleString('en-IN')}</span>}
              {tournament.team_budget_limit && <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-1 rounded-lg">Budget ₹{Number(tournament.team_budget_limit).toLocaleString('en-IN')}</span>}
            </div>
          )}
        </div>

        {/* Phase controls */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-50 flex-wrap items-center">
          {tournament.status === 'registration' && (
            <button onClick={() => confirmPhase('auction', 'Auction')} disabled={phaseAction.isPending}
              className="px-4 py-2 bg-amber-400 text-slate-900 font-bold text-sm rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-50 flex items-center gap-2">
              {phaseAction.isPending && <span className="w-3.5 h-3.5 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />}
              Start Auction Phase
            </button>
          )}
          {tournament.status === 'auction' && (
            <>
              <button
                onClick={() => window.location.href = `/auction?tournament_id=${tournament.id}`}
                className="px-4 py-2 bg-amber-400 text-slate-900 font-bold text-sm rounded-xl hover:bg-amber-300 transition-colors flex items-center gap-1.5">
                🎙 Open Auction Room
              </button>
              <button onClick={() => confirmPhase('league', 'League')} disabled={phaseAction.isPending}
                className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {phaseAction.isPending && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                Start League Stage
              </button>
            </>
          )}
          {['league', 'playoffs'].includes(tournament.status) && (
            <button onClick={() => confirmPhase('complete', 'Completed')} disabled={phaseAction.isPending}
              className="px-4 py-2 bg-gray-700 text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2">
              {phaseAction.isPending && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Complete Tournament
            </button>
          )}
          {phaseError && <p className="text-red-600 text-xs font-medium">⚠️ {phaseError}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {['players', 'teams', 'matches'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'players' && <PlayersTab tournament={tournament} />}
      {tab === 'teams' && <TeamsTab tournament={tournament} />}
      {tab === 'matches' && <MatchesTab tournament={tournament} />}
    </div>
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

export default function OrganizerDashboard() {
  const [view, setView] = useState('list'); // 'list' | 'create' | tournament_id string
  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['my-tournaments'],
    queryFn: getMyTournaments,
  });

  const activeTournament = typeof view === 'string' && view !== 'list' && view !== 'create'
    ? tournaments.find((t) => t.id === view)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Organizer Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage your cricket tournaments</p>
          </div>
          <button
            onClick={() => setView('create')}
            className="px-5 py-2.5 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors"
          >
            + New Tournament
          </button>
        </div>

        {view === 'create' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Create Tournament</h2>
              <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700">✕ Cancel</button>
            </div>
            <TournamentForm onSuccess={() => setView('list')} />
          </div>
        )}

        {activeTournament && (
          <div className="mb-6">
            <button onClick={() => setView('list')} className="text-sm text-amber-600 font-semibold hover:underline flex items-center gap-1">
              ← Back to My Tournaments
            </button>
          </div>
        )}

        {activeTournament ? (
          <TournamentDetail tournament={activeTournament} />
        ) : (
          <>
            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tournaments.length === 0 && view !== 'create' ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <p className="text-5xl mb-4">🏏</p>
                <p className="text-lg font-bold text-gray-700">No tournaments yet</p>
                <p className="text-gray-400 mt-1">Create your first tournament to get started</p>
                <button onClick={() => setView('create')}
                  className="mt-6 px-6 py-3 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors">
                  Create Tournament
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {tournaments.map((t) => {
                  const cfg = STATUS_CONFIG[t.status] ?? { label: t.status, color: 'bg-gray-100 text-gray-500' };
                  const teamPct = t.max_teams > 0 ? Math.min((t.team_count / t.max_teams) * 100, 100) : 0;
                  const nextDate = t.registration_end_date || t.auction_date || t.start_date;
                  return (
                    <button key={t.id} onClick={() => setView(t.id)}
                      className="group text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-amber-200 transition-all duration-200 overflow-hidden">
                      {/* Top accent bar */}
                      <div className={`h-1 w-full ${
                        t.status === 'registration' ? 'bg-emerald-400' :
                        t.status === 'auction' ? 'bg-amber-400' :
                        t.status === 'league' ? 'bg-blue-500' :
                        t.status === 'playoffs' ? 'bg-violet-500' : 'bg-gray-300'
                      }`} />

                      <div className="p-5">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-black text-gray-900 text-base leading-tight">{t.name}</h3>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        {t.venue && <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">📍 {t.venue}</p>}

                        {/* Player & Team counts */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-blue-50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-black text-blue-700">{t.player_count}</p>
                            <p className="text-xs text-blue-500 font-semibold mt-0.5">Players</p>
                          </div>
                          <div className="bg-emerald-50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-black text-emerald-700">{t.team_count}<span className="text-sm font-semibold text-emerald-400">/{t.max_teams}</span></p>
                            <p className="text-xs text-emerald-500 font-semibold mt-0.5">Teams</p>
                          </div>
                        </div>

                        {/* Teams progress bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Teams filled</span>
                            <span>{teamPct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                              style={{ width: `${teamPct}%` }} />
                          </div>
                        </div>

                        {/* Bottom meta */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="font-semibold text-gray-700">₹{t.registration_fee}</span>
                            <span className="text-gray-300">·</span>
                            <span>{t.overs} ov</span>
                          </div>
                          {nextDate && (
                            <span className="text-xs text-gray-400">
                              {new Date(nextDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
