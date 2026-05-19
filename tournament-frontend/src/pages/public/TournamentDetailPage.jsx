import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NavBar from '../../components/NavBar';
import { getTournament, getTournamentPlayers, getTournamentTeams } from '../../api/tournaments';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react';
import client from '../../api/client';
import PointsTable from '../../components/PointsTable';
import MatchSchedule from '../../components/MatchSchedule';
import TournamentStats from '../../components/TournamentStats';
import { requestToJoinTeam, getMyJoinRequests } from '../../api/teams';
import { getMyPlayers, registerPlayer } from '../../api/players';

const STATUS_CONFIG = {
  registration: { label: 'Registration Open', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  auction:      { label: 'Auction Phase',      color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  league:       { label: 'League Stage',       color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  playoffs:     { label: 'Playoffs',           color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  completed:    { label: 'Completed',          color: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-400' },
};

const TYPE_ICONS = { batsman: '🏏', bowler: '🎳', all_rounder: '⚡', wicket_keeper: '🧤' };

function PlayerTypeChip({ type }) {
  const colors = {
    batsman: 'bg-blue-50 text-blue-700',
    bowler: 'bg-red-50 text-red-700',
    all_rounder: 'bg-violet-50 text-violet-700',
    wicket_keeper: 'bg-orange-50 text-orange-700',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${colors[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {TYPE_ICONS[type]} {type.replace('_', ' ')}
    </span>
  );
}

export default function TournamentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState('info');
  const [playerSearch, setPlayerSearch] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: myJoinRequests = [] } = useQuery({
    queryKey: ['my-join-requests'],
    queryFn: getMyJoinRequests,
    enabled: !!user,
  });

  const { data: myPlayers = [] } = useQuery({
    queryKey: ['my-players'],
    queryFn: getMyPlayers,
    enabled: !!user,
  });
  const standalonePlayer = myPlayers.find((p) => !p.tournament_id) ?? null;

  const quickRegMut = useMutation({
    mutationFn: () => {
      const p = standalonePlayer;
      const fd = new FormData();
      fd.append('name', p.name);
      fd.append('age', p.age);
      fd.append('address', p.address);
      fd.append('player_type', p.player_type);
      fd.append('tshirt_size', p.tshirt_size);
      fd.append('tournament_id', id);
      if (p.phone) fd.append('phone', p.phone);
      if (p.photo_url) fd.append('photo_url', p.photo_url);
      return registerPlayer(fd);
    },
    onSuccess: ({ data: newPlayer }) => {
      setShowConfirm(false);
      navigate('/player/payment', { state: { player_id: newPlayer.id, fee: tournament.registration_fee } });
    },
  });

  const joinMutation = useMutation({
    mutationFn: (teamId) => requestToJoinTeam(teamId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-join-requests'] }),
  });

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => getTournament(id),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['tournament-players', id],
    queryFn: () => getTournamentPlayers(id),
    enabled: !!id,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['tournament-teams', id],
    queryFn: () => getTournamentTeams(id),
    enabled: tab === 'teams',
  });

  const registerMutation = useMutation({
    mutationFn: () => navigate(`/player/register?tournament_id=${id}`),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex justify-center py-32">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!tournament) return null;

  const cfg = STATUS_CONFIG[tournament.status] ?? { label: tournament.status, color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' };
  const myPlayer = user ? players.find((p) => p.user_id === user.id) : null;
  const alreadyPaid = myPlayer?.payment_status === 'success';
  const awaitingPayment = !!myPlayer && !alreadyPaid;
  const canRegister = tournament.status === 'registration' && !!user;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
              </div>
              <h1 className="text-3xl font-black">{tournament.name}</h1>
              {tournament.description && (
                <p className="text-slate-300 mt-2 max-w-xl">{tournament.description}</p>
              )}
              {tournament.venue && (
                <p className="text-slate-400 text-sm mt-2">📍 {tournament.venue}</p>
              )}
            </div>
            {tournament.status === 'auction' && user && (
              <button
                onClick={() => navigate(`/auction?tournament_id=${id}`)}
                className="px-6 py-3 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20 flex items-center gap-2"
              >
                🎙 Join Auction Room
              </button>
            )}
            {canRegister && (
              alreadyPaid ? (
                <div className="flex items-center gap-2 px-6 py-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold rounded-xl cursor-default select-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Already Registered
                </div>
              ) : awaitingPayment ? (
                <button
                  onClick={() => navigate('/player/payment', { state: { player_id: myPlayer.id, fee: tournament.registration_fee } })}
                  className="px-6 py-3 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Complete Payment
                </button>
              ) : (
                <button
                  onClick={() => standalonePlayer ? setShowConfirm(true) : navigate(`/player/register?tournament_id=${id}`)}
                  className="px-6 py-3 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20"
                >
                  Register as Player
                </button>
              )
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            {[
              { label: 'Registration Fee', value: `₹${tournament.registration_fee}` },
              { label: 'Max Teams',        value: tournament.max_teams },
              { label: 'Overs',            value: tournament.overs },
              { label: 'Match Start',      value: tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('en-IN') : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 rounded-xl px-4 py-3 text-center">
                <p className="text-xl font-black">{value}</p>
                <p className="text-xs text-slate-300 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Key dates & pricing badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {tournament.registration_start_date && (
              <span className="bg-white/10 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-full">
                📋 Reg. {new Date(tournament.registration_start_date).toLocaleDateString('en-IN')}
                {tournament.registration_end_date && ` – ${new Date(tournament.registration_end_date).toLocaleDateString('en-IN')}`}
              </span>
            )}
            {tournament.auction_date && (
              <span className="bg-amber-400/20 text-amber-300 text-xs font-medium px-3 py-1.5 rounded-full">
                🔨 Auction {new Date(tournament.auction_date).toLocaleDateString('en-IN')}
              </span>
            )}
            {tournament.player_base_price && (
              <span className="bg-white/10 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-full">
                Floor ₹{Number(tournament.player_base_price).toLocaleString('en-IN')}
              </span>
            )}
            {tournament.player_upper_price && (
              <span className="bg-white/10 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-full">
                Cap ₹{Number(tournament.player_upper_price).toLocaleString('en-IN')}
              </span>
            )}
            {tournament.team_budget_limit && (
              <span className="bg-white/10 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-full">
                Budget ₹{Number(tournament.team_budget_limit).toLocaleString('en-IN')} / team
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-8">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
          {['info', 'schedule', 'standings', 'stats', 'players', 'teams'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="font-bold text-gray-900 mb-2">About this Tournament</h2>
              <p className="text-gray-600">{tournament.description || 'No description provided.'}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Schedule</h3>
                <dl className="space-y-2 text-sm">
                  {tournament.registration_start_date && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Registration Opens</dt>
                      <dd className="font-semibold text-gray-900">{new Date(tournament.registration_start_date).toLocaleDateString('en-IN')}</dd>
                    </div>
                  )}
                  {tournament.registration_end_date && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Registration Closes</dt>
                      <dd className="font-semibold text-gray-900">{new Date(tournament.registration_end_date).toLocaleDateString('en-IN')}</dd>
                    </div>
                  )}
                  {tournament.auction_date && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Auction Date</dt>
                      <dd className="font-semibold text-amber-600">{new Date(tournament.auction_date).toLocaleString('en-IN')}</dd>
                    </div>
                  )}
                  {tournament.start_date && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Matches Begin</dt>
                      <dd className="font-semibold text-gray-900">{new Date(tournament.start_date).toLocaleDateString('en-IN')}</dd>
                    </div>
                  )}
                  {tournament.end_date && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Matches End</dt>
                      <dd className="font-semibold text-gray-900">{new Date(tournament.end_date).toLocaleDateString('en-IN')}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Auction Pricing</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Registration Fee</dt>
                    <dd className="font-semibold text-gray-900">₹{tournament.registration_fee.toLocaleString('en-IN')}</dd>
                  </div>
                  {tournament.player_base_price && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Player Base Price</dt>
                      <dd className="font-semibold text-gray-900">₹{Number(tournament.player_base_price).toLocaleString('en-IN')}</dd>
                    </div>
                  )}
                  {tournament.player_upper_price && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Player Price Cap</dt>
                      <dd className="font-semibold text-violet-700">₹{Number(tournament.player_upper_price).toLocaleString('en-IN')}</dd>
                    </div>
                  )}
                  {tournament.team_budget_limit && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Team Budget Limit</dt>
                      <dd className="font-semibold text-amber-600">₹{Number(tournament.team_budget_limit).toLocaleString('en-IN')}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Max Teams</dt>
                    <dd className="font-semibold text-gray-900">{tournament.max_teams}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Overs per Match</dt>
                    <dd className="font-semibold text-gray-900">{tournament.overs}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {tab === 'schedule' && (
          <MatchSchedule tournamentId={id} />
        )}

        {tab === 'standings' && (
          <PointsTable tournamentId={id} />
        )}

        {tab === 'stats' && (
          <TournamentStats tournamentId={id} />
        )}

        {tab === 'players' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between gap-4 flex-wrap">
              <h2 className="font-bold text-gray-900">Registered Players ({players.filter(p => p.payment_status === 'success').length})</h2>
              <input
                type="search"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="Search players…"
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-48"
              />
            </div>
            {players.filter(p => p.payment_status === 'success').length === 0 ? (
              <p className="text-center py-12 text-gray-400">No players registered yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {players.filter(p => p.payment_status === 'success' && p.name.toLowerCase().includes(playerSearch.toLowerCase())).length === 0 ? (
                  <p className="text-center py-10 text-gray-400 text-sm">No players match "{playerSearch}"</p>
                ) : players.filter(p => p.payment_status === 'success' && p.name.toLowerCase().includes(playerSearch.toLowerCase())).map((p) => (
                  <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                        {p.name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">Age {p.age}</p>
                    </div>
                    <PlayerTypeChip type={p.player_type} />
                    <div className="text-right">
                      <p className="font-bold text-gray-900">₹{p.base_price.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">Base</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'teams' && (
          <div className="grid sm:grid-cols-2 gap-4">
            {teams.length === 0 ? (
              <div className="col-span-2 text-center py-16 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-3">🏆</p>
                <p className="font-semibold text-gray-600">No teams yet</p>
                <p className="text-sm text-gray-400 mt-1">Teams will appear here once the organizer adds them.</p>
              </div>
            ) : (
              teams.map((t) => {
                const myReq = myJoinRequests.find((r) => r.team_id === t.id);
                const alreadyApproved = myJoinRequests.some((r) => r.status === 'approved');
                const isMyTeam = t.owner_id === user?.id;

                return (
                  <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-4 mb-4">
                      {t.logo_url ? (
                        <img src={t.logo_url} alt={t.name} className="w-14 h-14 rounded-xl object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xl">
                          {t.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900">{t.name}</p>
                        <p className="text-sm text-gray-500">Budget: ₹{Number(t.remaining_budget).toLocaleString()} left</p>
                        {isMyTeam && <span className="text-xs font-bold text-amber-600">You are the captain</span>}
                      </div>
                    </div>

                    {user && !isMyTeam && (
                      myReq?.status === 'approved' ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          You are in this team
                        </div>
                      ) : myReq?.status === 'pending' ? (
                        <div className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                          ⏳ Request pending — waiting for captain to approve
                        </div>
                      ) : myReq?.status === 'rejected' ? (
                        <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                          Request was declined
                        </div>
                      ) : alreadyApproved ? null : (
                        <button
                          onClick={() => joinMutation.mutate(t.id)}
                          disabled={joinMutation.isPending}
                          className="w-full py-2 bg-amber-400 text-slate-900 text-sm font-bold rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-50"
                        >
                          {joinMutation.isPending && joinMutation.variables === t.id ? 'Requesting…' : 'Request to Join'}
                        </button>
                      )
                    )}
                    {isMyTeam && (
                      <a
                        href="/my-team"
                        className="block text-center w-full py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors"
                      >
                        Manage Team →
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="h-16" />

      {/* Quick-register confirmation modal */}
      {showConfirm && standalonePlayer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-black text-gray-900 text-lg mb-1">Confirm Registration</h3>
            <p className="text-sm text-gray-500 mb-5">Registering for <span className="font-semibold text-gray-700">{tournament.name}</span> using your saved profile.</p>

            {/* Profile summary */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-5">
              {standalonePlayer.photo_url ? (
                <img src={standalonePlayer.photo_url} alt={standalonePlayer.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xl shrink-0">
                  {standalonePlayer.name[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-gray-900">{standalonePlayer.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">{standalonePlayer.player_type.replace('_', ' ')} · {standalonePlayer.tshirt_size}</p>
                {standalonePlayer.jersey_number && <p className="text-xs text-amber-600 font-semibold mt-0.5">#{standalonePlayer.jersey_number}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-gray-100 mb-5">
              <span className="text-sm text-gray-500">Registration Fee</span>
              <span className="text-lg font-black text-amber-600">₹{tournament.registration_fee}</span>
            </div>

            {quickRegMut.isError && (
              <p className="text-red-500 text-xs mb-3 font-medium">
                ⚠️ {quickRegMut.error?.response?.data?.detail ?? 'Registration failed'}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => quickRegMut.mutate()}
                disabled={quickRegMut.isPending}
                className="flex-1 py-2.5 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 disabled:opacity-50 text-sm transition-colors"
              >
                {quickRegMut.isPending ? 'Registering…' : 'Confirm & Pay'}
              </button>
            </div>

            <button
              onClick={() => { setShowConfirm(false); navigate(`/player/register?tournament_id=${id}`); }}
              className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 text-center"
            >
              Use a different profile instead →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
