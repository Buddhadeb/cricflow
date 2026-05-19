import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import NavBar from '../../components/NavBar';
import { useAuthStore } from '../../store/authStore';
import {
  getMyTeams,
  getTeamSquad,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  createTeam,
  getMyJoinRequests,
  requestToJoinTeam,
} from '../../api/teams';
import { listChallenges, discoverTeams } from '../../api/challenges';
import { getMyPlayers } from '../../api/players';

const TYPE_COLORS = {
  batsman: 'bg-blue-50 text-blue-700',
  bowler: 'bg-red-50 text-red-700',
  all_rounder: 'bg-violet-50 text-violet-700',
  wicket_keeper: 'bg-orange-50 text-orange-700',
};

function PlayerAvatar({ name, photoUrl, size = 'md' }) {
  const sz = size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-xs';
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className={`${sz} rounded-full object-cover`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-slate-800 flex items-center justify-center text-white font-bold`}>
      {name?.[0] ?? '?'}
    </div>
  );
}

function RequestCard({ req, onApprove, onReject, isApproving, isRejecting }) {
  const p = req.player;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <PlayerAvatar name={p?.name} photoUrl={p?.photo_url} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{p?.name ?? '—'}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {p?.player_type && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${TYPE_COLORS[p.player_type] ?? 'bg-gray-100 text-gray-600'}`}>
              {p.player_type.replace('_', ' ')}
            </span>
          )}
          {p?.age && <span className="text-xs text-gray-400">Age {p.age}</span>}
          {p?.tshirt_size && <span className="text-xs text-gray-400">Size {p.tshirt_size}</span>}
        </div>
      </div>
      {req.status === 'pending' ? (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onApprove}
            disabled={isApproving}
            className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {isApproving ? '…' : 'Approve'}
          </button>
          <button
            onClick={onReject}
            disabled={isRejecting}
            className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {isRejecting ? '…' : 'Decline'}
          </button>
        </div>
      ) : (
        <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${
          req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500'
        }`}>
          {req.status}
        </span>
      )}
    </div>
  );
}

const STATUS_STYLE = {
  pending:  { label: 'Pending',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  accepted: { label: 'Accepted', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Declined', cls: 'bg-red-50 text-red-500 border-red-200' },
};

function TeamDetail({ team }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('requests');
  const appUrl = window.location.origin;

  const { data: requests = [], isLoading: loadingReqs } = useQuery({
    queryKey: ['join-requests', team.id],
    queryFn: () => getJoinRequests(team.id),
    refetchInterval: 15_000,
  });

  const { data: squad = [], isLoading: loadingSquad } = useQuery({
    queryKey: ['team-squad', team.id],
    queryFn: () => getTeamSquad(team.id),
    enabled: tab === 'squad',
  });

  const { data: allChallenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: listChallenges,
    enabled: tab === 'challenges',
  });

  const approveMut = useMutation({
    mutationFn: ({ requestId }) => approveJoinRequest(team.id, requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['join-requests', team.id] });
      qc.invalidateQueries({ queryKey: ['team-squad', team.id] });
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ requestId }) => rejectJoinRequest(team.id, requestId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['join-requests', team.id] }),
  });

  const pending = requests.filter((r) => r.status === 'pending');
  const reviewed = requests.filter((r) => r.status !== 'pending');
  const teamChallenges = allChallenges.filter((c) => c.team_a_id === team.id || c.team_b_id === team.id);

  const waInviteText = encodeURIComponent(
    `Join my cricket team "${team.name}" on CricFlow! Sign up at ${appUrl} and search for our team to request membership. 🏏`
  );
  const waUrl = `https://wa.me/?text=${waInviteText}`;

  return (
    <div>
      {/* Team header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-2xl">
              {team.name[0]}
            </div>
          )}
          <div>
            <h2 className="text-xl font-black text-gray-900">{team.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Budget: ₹{Number(team.remaining_budget).toLocaleString('en-IN')} remaining
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                You are the captain
              </span>
              <span className="text-xs text-gray-400">{squad.length} players in squad</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-5 flex-wrap">
        {[
          { key: 'requests', label: `Requests${pending.length ? ` (${pending.length})` : ''}` },
          { key: 'squad', label: 'Squad' },
          { key: 'challenges', label: 'Challenges' },
          { key: 'invite', label: 'Invite' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {key === 'requests' && pending.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-amber-400 text-slate-900 text-xs font-black rounded-full">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <div className="space-y-4">
          {loadingReqs ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <>
              {pending.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-amber-100 bg-amber-50">
                    <h3 className="text-sm font-bold text-amber-800">Pending Approval ({pending.length})</h3>
                    <p className="text-xs text-amber-600 mt-0.5">Review each player and decide who joins your squad.</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {pending.map((req) => (
                      <RequestCard
                        key={req.id}
                        req={req}
                        onApprove={() => approveMut.mutate({ requestId: req.id })}
                        onReject={() => rejectMut.mutate({ requestId: req.id })}
                        isApproving={approveMut.isPending && approveMut.variables?.requestId === req.id}
                        isRejecting={rejectMut.isPending && rejectMut.variables?.requestId === req.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {reviewed.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <h3 className="text-sm font-bold text-gray-700">Reviewed ({reviewed.length})</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {reviewed.map((req) => (
                      <RequestCard key={req.id} req={req} />
                    ))}
                  </div>
                </div>
              )}

              {requests.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <p className="text-4xl mb-3">📩</p>
                  <p className="font-semibold text-gray-600">No join requests yet</p>
                  <p className="text-sm text-gray-400 mt-1">Players will see a "Request to Join" button on your team card.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'squad' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Squad ({squad.length} players)</h3>
          </div>
          {loadingSquad ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : squad.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <p className="text-3xl mb-3">🏏</p>
              <p>No players yet — approve join requests to build your squad.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {squad.map((tp, idx) => {
                const p = tp.player;
                return (
                  <div key={tp.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xs font-bold text-gray-300 w-5 text-center">{idx + 1}</span>
                    <PlayerAvatar name={p?.name} photoUrl={p?.photo_url} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{p?.name ?? '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p?.player_type && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${TYPE_COLORS[p.player_type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {p.player_type.replace('_', ' ')}
                          </span>
                        )}
                        {p?.age && <span className="text-xs text-gray-400">Age {p.age}</span>}
                      </div>
                    </div>
                    <Link
                      to={`/stats/players/${tp.player_id}`}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Stats
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
          {squad.length >= 11 && (
            <div className="px-4 py-3 border-t border-gray-50 bg-emerald-50">
              <p className="text-xs text-emerald-700 font-semibold">
                ✓ You have {squad.length} players — ready to set your Playing XI on match day.
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Go to the match page and use "Set Playing XI" to select your 11.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'challenges' && (
        <div className="space-y-3">
          {teamChallenges.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-4xl mb-3">⚔️</p>
              <p className="font-semibold text-gray-600">No challenge matches yet</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">Challenge another team from the Challenges page.</p>
              <Link to="/challenges" className="px-5 py-2.5 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors text-sm">
                Go to Challenges →
              </Link>
            </div>
          ) : (
            <>
              {teamChallenges.slice(0, 5).map((ch) => {
                const st = STATUS_STYLE[ch.status] ?? STATUS_STYLE.pending;
                const opponent = ch.team_a_id === team.id ? ch.team_b : ch.team_a;
                const prize = ch.prize_amount ? `₹${Number(ch.prize_amount).toLocaleString('en-IN')}` : null;
                return (
                  <Link key={ch.id} to={`/challenges/${ch.id}`}
                    className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm shrink-0">
                      {opponent?.name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm">vs {opponent?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{ch.overs} overs{prize ? ` · ${prize}` : ''}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${st.cls}`}>{st.label}</span>
                  </Link>
                );
              })}
              <Link to="/challenges" className="block text-center text-sm font-semibold text-amber-600 hover:underline py-2">
                See all challenges →
              </Link>
            </>
          )}
        </div>
      )}

      {tab === 'invite' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <h3 className="font-bold text-gray-900 mb-1">Recruit Players</h3>
            <p className="text-sm text-gray-500 mb-6">Share this QR code or WhatsApp link for players to find and join your team.</p>
            <div className="flex justify-center mb-5">
              <div className="p-4 bg-white rounded-2xl border-2 border-gray-100 shadow-sm inline-block">
                <QRCodeSVG value={appUrl} size={180} bgColor="#ffffff" fgColor="#0f172a" level="M" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-6">Players scan this to open CricFlow, then search for <span className="font-bold text-gray-600">"{team.name}"</span></p>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Share on WhatsApp
            </a>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-xs text-amber-800 font-semibold mb-1">How it works</p>
            <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
              <li>Player scans QR code or clicks your WhatsApp link</li>
              <li>They sign up / log in to CricFlow</li>
              <li>They find your team and tap "Request to Join"</li>
              <li>You approve them in the Requests tab</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

const REQ_STYLE = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-500 border-red-200',
};

function FindTeamSection({ myTeamIds = [] }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [joinError, setJoinError] = useState('');
  // Track successful requests locally so button disables immediately (no wait for refetch)
  const [sentTeamIds, setSentTeamIds] = useState(new Set());

  const { data: myPlayers = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['my-players'],
    queryFn: getMyPlayers,
    enabled: !!user,
  });

  const standalonePlayer = myPlayers.find((p) => !p.tournament_id);
  const alreadyInTeam = standalonePlayer?.status === 'sold';

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-join-requests'],
    queryFn: getMyJoinRequests,
    enabled: !!user,
    refetchInterval: 15_000,
  });

  const { data: discovered = [] } = useQuery({
    queryKey: ['discover-teams', search],
    queryFn: () => discoverTeams({ q: search }),
    enabled: search.length >= 2,
  });

  const joinMut = useMutation({
    mutationFn: (teamId) => requestToJoinTeam(teamId),
    onSuccess: (_, teamId) => {
      setJoinError('');
      setSentTeamIds((prev) => new Set([...prev, teamId]));
      qc.invalidateQueries({ queryKey: ['my-join-requests'] });
    },
    onError: (e) => {
      const msg = e?.response?.data?.detail ?? 'Failed to send join request. Please try again.';
      setJoinError(msg);
    },
  });

  const requestedTeamIds = new Set([...myRequests.map((r) => r.team_id), ...sentTeamIds]);
  const filteredDiscovered = discovered.filter((t) => !myTeamIds.includes(t.id));

  // Determine which status a team button should show
  const getTeamAction = (team) => {
    const myReq = myRequests.find((r) => r.team_id === team.id);
    if (myReq) return { type: 'badge', status: myReq.status };
    if (sentTeamIds.has(team.id)) return { type: 'badge', status: 'pending' };
    return { type: 'button' };
  };

  return (
    <div className="space-y-4">
      {/* Blocker banners — shown only after players have loaded */}
      {!loadingPlayers && !standalonePlayer && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <span className="text-lg mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-800">Player profile required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              You need a player profile to join a team.{' '}
              <Link to="/profile" className="underline font-semibold">Complete your Profile</Link> first.
            </p>
          </div>
        </div>
      )}
      {!loadingPlayers && alreadyInTeam && (
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
          <span className="text-lg mt-0.5">🏏</span>
          <div>
            <p className="text-sm font-bold text-slate-700">You're already in a team</p>
            <p className="text-xs text-slate-500 mt-0.5">Your player profile is assigned to a team. You can't join another one.</p>
          </div>
        </div>
      )}

      {/* My existing requests */}
      {myRequests.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50">
            <h3 className="font-bold text-gray-900 text-sm">My Join Requests</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {myRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {req.team?.name?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{req.team?.name ?? 'Unknown team'}</p>
                  <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${REQ_STYLE[req.status] ?? REQ_STYLE.pending}`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-1">Find a Team</h3>
        <p className="text-xs text-gray-400 mb-4">Search for a team by name and request to join</p>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setJoinError(''); }}
          placeholder="Search team name…"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />

        {joinError && (
          <div className="mt-3 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span className="text-red-500 font-bold text-sm shrink-0">✕</span>
            <p className="text-sm text-red-700 font-medium">{joinError}</p>
          </div>
        )}

        {search.length >= 2 && (
          <div className="mt-3 space-y-2">
            {filteredDiscovered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No teams found for "{search}"</p>
            ) : (
              filteredDiscovered.map((team) => {
                const action = getTeamAction(team);
                const isSending = joinMut.isPending && joinMut.variables === team.id;
                const canJoin = standalonePlayer && !alreadyInTeam && !requestedTeamIds.has(team.id);
                return (
                  <div key={team.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden">
                      {team.logo_url
                        ? <img src={team.logo_url} alt={team.name} className="w-10 h-10 object-cover" />
                        : team.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{team.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {team.city && <span className="text-xs text-gray-400">{team.city}</span>}
                        {team.open_to_challenges && (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Open</span>
                        )}
                      </div>
                    </div>
                    {action.type === 'badge' ? (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 capitalize ${REQ_STYLE[action.status] ?? REQ_STYLE.pending}`}>
                        {action.status}
                      </span>
                    ) : canJoin ? (
                      <button
                        onClick={() => joinMut.mutate(team.id)}
                        disabled={isSending}
                        className="px-3 py-1.5 bg-amber-400 text-slate-900 text-xs font-bold rounded-lg hover:bg-amber-300 transition-colors disabled:opacity-50 shrink-0"
                      >
                        {isSending ? '…' : 'Request to Join'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 shrink-0 font-medium">
                        {!standalonePlayer ? 'Profile needed' : alreadyInTeam ? 'In a team' : '—'}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {search.length > 0 && search.length < 2 && (
          <p className="text-xs text-gray-400 mt-2">Type at least 2 characters to search</p>
        )}
      </div>
    </div>
  );
}

function CreateTeamForm({ onSuccess }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [openToChallenges, setOpenToChallenges] = useState(true);
  const [error, setError] = useState('');
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: () => createTeam({ name: name.trim(), city: city.trim() || null, description: description.trim() || null, open_to_challenges: openToChallenges }),
    onSuccess: (team) => {
      qc.invalidateQueries({ queryKey: ['my-teams'] });
      onSuccess(team.id);
    },
    onError: (e) => setError(e?.response?.data?.detail ?? 'Failed to create team'),
  });

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white';

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6">
      <h2 className="font-black text-gray-900 text-xl mb-1">Create Your Team</h2>
      <p className="text-sm text-gray-500 mb-5">You'll be the captain. Invite players to join after creation.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Team Name <span className="text-red-400">*</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mumbai Warriors" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Team Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Tell others about your team…" className={`${inputCls} resize-none`} />
        </div>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setOpenToChallenges((v) => !v)}
            className={`w-10 h-6 rounded-full transition-colors relative ${openToChallenges ? 'bg-amber-400' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${openToChallenges ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Open to Challenges</p>
            <p className="text-xs text-gray-400">Other teams can find and challenge you to matches</p>
          </div>
        </label>

        {error && <p className="text-red-500 text-sm">⚠️ {error}</p>}

        <button
          onClick={() => { if (!name.trim()) { setError('Team name is required'); return; } mut.mutate(); }}
          disabled={mut.isPending}
          className="w-full py-3 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-50"
        >
          {mut.isPending ? 'Creating…' : 'Create Team'}
        </button>
      </div>
    </div>
  );
}

export default function TeamCaptainPage() {
  const { user } = useAuthStore();
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: myTeams = [], isLoading } = useQuery({
    queryKey: ['my-teams'],
    queryFn: getMyTeams,
    enabled: !!user,
  });

  const selectedTeam = selectedTeamId
    ? myTeams.find((t) => t.id === selectedTeamId)
    : myTeams.length === 1 ? myTeams[0] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">My Team</h1>
            <p className="text-gray-500 mt-1">Manage your squad and approve join requests</p>
          </div>
          {!showCreate && !selectedTeam && myTeams.length > 0 && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2.5 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors text-sm"
            >
              + New Team
            </button>
          )}
        </div>

        {showCreate && (
          <div className="mb-6">
            <CreateTeamForm
              onSuccess={(id) => { setShowCreate(false); setSelectedTeamId(id); }}
            />
            <button onClick={() => setShowCreate(false)} className="mt-3 text-sm text-gray-400 hover:text-gray-600 block mx-auto">
              Cancel
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : myTeams.length === 0 && !showCreate ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">🏏</p>
            <p className="text-lg font-bold text-gray-700">You don't have a team yet</p>
            <p className="text-gray-400 mt-1 text-sm mb-5">Create your own team, or search and join one below.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-2.5 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors text-sm"
            >
              + Create My Team
            </button>
          </div>
        ) : (
          <>
            {/* Team picker when captain owns multiple teams */}
            {myTeams.length > 1 && !selectedTeam && !showCreate && (
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                {myTeams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTeamId(t.id)}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:border-amber-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-lg">
                        {t.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{t.city ?? 'No city set'}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {myTeams.length > 1 && selectedTeam && (
              <button
                onClick={() => setSelectedTeamId(null)}
                className="text-sm text-amber-600 font-semibold hover:underline mb-4 flex items-center gap-1"
              >
                ← All my teams
              </button>
            )}

            {selectedTeam && <TeamDetail team={selectedTeam} />}
          </>
        )}

        {/* Always show Find a Team — even captains can join other teams as players */}
        {!showCreate && !isLoading && (
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Join another team</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <FindTeamSection myTeamIds={myTeams.map((t) => t.id)} />
          </div>
        )}
      </div>
    </div>
  );
}
