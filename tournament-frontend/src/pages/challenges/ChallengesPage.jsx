import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import { useAuthStore } from '../../store/authStore';
import { getMyTeams } from '../../api/teams';
import { listChallenges, createChallenge, discoverTeams } from '../../api/challenges';

const STATUS_STYLE = {
  pending:  { label: 'Pending',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  accepted: { label: 'Accepted', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Declined', cls: 'bg-red-50 text-red-500 border-red-200' },
};

function TeamAvatar({ name, logoUrl, size = 'sm' }) {
  const dim = size === 'lg' ? 'w-12 h-12 text-lg' : 'w-8 h-8 text-sm';
  if (logoUrl) return <img src={logoUrl} alt={name} className={`${dim} rounded-xl object-cover`} />;
  return (
    <div className={`${dim} rounded-xl bg-slate-800 flex items-center justify-center text-white font-black`}>
      {name?.[0] ?? '?'}
    </div>
  );
}

function ChallengeCard({ ch, myTeamIds }) {
  const st = STATUS_STYLE[ch.status] ?? STATUS_STYLE.pending;
  const iSent = myTeamIds.includes(ch.team_a_id);
  const prize = ch.prize_amount ? `₹${Number(ch.prize_amount).toLocaleString('en-IN')}` : null;

  return (
    <Link to={`/challenges/${ch.id}`} className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-5">
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${st.cls}`}>{st.label}</span>
        <span className="text-xs text-gray-400">{new Date(ch.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <TeamAvatar name={ch.team_a?.name} logoUrl={ch.team_a?.logo_url} />
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">{ch.team_a?.name ?? '—'}</p>
            {iSent && <p className="text-xs text-amber-600 font-semibold">You</p>}
          </div>
        </div>
        <div className="text-center shrink-0">
          <p className="text-xs font-black text-gray-300 uppercase tracking-widest">vs</p>
          {prize && <p className="text-xs font-bold text-emerald-600 mt-0.5">{prize}</p>}
        </div>
        <div className="flex items-center gap-2 flex-1 flex-row-reverse">
          <TeamAvatar name={ch.team_b?.name} logoUrl={ch.team_b?.logo_url} />
          <div className="text-right">
            <p className="font-bold text-gray-900 text-sm leading-tight">{ch.team_b?.name ?? '—'}</p>
            {!iSent && <p className="text-xs text-amber-600 font-semibold">You</p>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-50 text-xs text-gray-400">
        <span>{ch.overs} overs</span>
        {ch.venue && <><span>·</span><span>{ch.venue}</span></>}
        {ch.match_date && <><span>·</span><span>{new Date(ch.match_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span></>}
      </div>
    </Link>
  );
}

function CreateChallengeForm({ myTeams, onSuccess, onCancel }) {
  const [teamAId, setTeamAId] = useState(myTeams[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [form, setForm] = useState({ overs: 20, venue: '', match_date: '', prize_amount: '' });
  const [error, setError] = useState('');

  const { data: discovered = [] } = useQuery({
    queryKey: ['discover-teams', search],
    queryFn: () => discoverTeams({ q: search }),
    enabled: search.length >= 2,
  });

  const mutation = useMutation({
    mutationFn: () => createChallenge(teamAId, {
      team_b_id: selectedOpponent.id,
      overs: Number(form.overs),
      venue: form.venue || null,
      match_date: form.match_date || null,
      prize_amount: form.prize_amount ? Number(form.prize_amount) : null,
    }),
    onSuccess,
    onError: (e) => setError(e?.response?.data?.detail ?? 'Failed to send challenge'),
  });

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-gray-900">New Challenge Match</h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
      </div>

      <div className="space-y-4">
        {/* My team */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Your Team</label>
          <select value={teamAId} onChange={(e) => setTeamAId(e.target.value)} className={inputCls}>
            {myTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Opponent search */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Opponent Team</label>
          {selectedOpponent ? (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <TeamAvatar name={selectedOpponent.name} logoUrl={selectedOpponent.logo_url} />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{selectedOpponent.name}</p>
                {selectedOpponent.city && <p className="text-xs text-gray-400">{selectedOpponent.city}</p>}
              </div>
              <button onClick={() => setSelectedOpponent(null)} className="text-xs text-gray-400 hover:text-red-500">Change</button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team by name…"
                className={inputCls}
              />
              {discovered.filter((t) => t.id !== teamAId).length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                  {discovered.filter((t) => t.id !== teamAId).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedOpponent(t); setSearch(''); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-left"
                    >
                      <TeamAvatar name={t.name} logoUrl={t.logo_url} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                        {t.city && <p className="text-xs text-gray-400">{t.city}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {search.length >= 2 && discovered.filter((t) => t.id !== teamAId).length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No teams found — try a different name</p>
              )}
            </div>
          )}
        </div>

        {/* Match details */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Overs</label>
            <input type="number" value={form.overs} onChange={(e) => setForm((f) => ({ ...f, overs: e.target.value }))} className={inputCls} min={1} max={50} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Prize Amount (₹)</label>
            <input type="number" value={form.prize_amount} onChange={(e) => setForm((f) => ({ ...f, prize_amount: e.target.value }))} placeholder="e.g. 500" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Venue</label>
          <input value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} placeholder="Ground name or address" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Match Date & Time</label>
          <input type="datetime-local" value={form.match_date} onChange={(e) => setForm((f) => ({ ...f, match_date: e.target.value }))} className={inputCls} />
        </div>

        {error && <p className="text-red-600 text-sm">⚠️ {error}</p>}

        <button
          onClick={() => { if (!selectedOpponent) { setError('Select an opponent team'); return; } mutation.mutate(); }}
          disabled={mutation.isPending}
          className="w-full py-2.5 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Sending…' : 'Send Challenge'}
        </button>
      </div>
    </div>
  );
}

export default function ChallengesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: myTeams = [] } = useQuery({ queryKey: ['my-teams'], queryFn: getMyTeams, enabled: !!user });
  const { data: challenges = [], isLoading } = useQuery({ queryKey: ['challenges'], queryFn: listChallenges, enabled: !!user });

  const myTeamIds = myTeams.map((t) => t.id);
  const pending = challenges.filter((c) => c.status === 'pending');
  const others = challenges.filter((c) => c.status !== 'pending');

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Challenge Matches</h1>
            <p className="text-gray-500 mt-1">Challenge any team to a match with a prize</p>
          </div>
          {myTeams.length > 0 && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors flex items-center gap-2"
            >
              ⚔️ New Challenge
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-6">
            <CreateChallengeForm
              myTeams={myTeams}
              onSuccess={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['challenges'] }); }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {myTeams.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-sm text-amber-800">
            You need to own a team before challenging others. Go to <Link to="/my-team" className="font-bold underline">My Team</Link> first.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-5xl mb-4">⚔️</p>
            <p className="text-lg font-bold text-gray-700">No challenges yet</p>
            <p className="text-gray-400 mt-1 text-sm">Challenge another team to a match and set a prize amount.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Awaiting Response ({pending.length})</h2>
                <div className="space-y-3">
                  {pending.map((ch) => <ChallengeCard key={ch.id} ch={ch} myTeamIds={myTeamIds} />)}
                </div>
              </section>
            )}
            {others.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">History</h2>
                <div className="space-y-3">
                  {others.map((ch) => <ChallengeCard key={ch.id} ch={ch} myTeamIds={myTeamIds} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
