import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAuctionWS } from '../../hooks/useAuctionWS';
import AuctionCard from '../../components/AuctionCard';
import BidButton from '../../components/BidButton';
import NavBar from '../../components/NavBar';
import {
  startAuction, pauseAuction, resumeAuction,
  nextPlayer, sellPlayer, unsoldPlayer,
} from '../../api/auction';
import { getTournamentTeams, getTournament } from '../../api/tournaments';

function TimerRing({ remaining, total = 30 }) {
  const pct = total > 0 ? remaining / total : 0;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const isUrgent = remaining <= 5;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width="110" height="110" className="-rotate-90">
          <circle cx="55" cy="55" r={r} stroke={isUrgent ? '#fee2e2' : '#e0f2fe'} strokeWidth="10" fill="none" />
          <circle
            cx="55" cy="55" r={r}
            stroke={isUrgent ? '#ef4444' : '#3b82f6'}
            strokeWidth="10"
            fill="none"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black ${isUrgent ? 'text-red-500' : 'text-blue-600'}`}>
            {remaining ?? '—'}
          </span>
          <span className="text-xs text-gray-400 font-medium">sec</span>
        </div>
      </div>
    </div>
  );
}

const EVENT_ICONS = {
  AUCTION_STARTED: '🚀', AUCTION_PAUSED: '⏸', AUCTION_RESUMED: '▶️',
  AUCTION_COMPLETED: '🏁', PLAYER_UP: '📋', BID_PLACED: '💰',
  PLAYER_SOLD: '✅', PLAYER_UNSOLD: '❌', TIMER_TICK: null,
  BID_REJECTED: '⚠️', ERROR: '🔴',
};

const STATUS_STYLE = {
  active: 'bg-green-500 text-white',
  paused: 'bg-amber-500 text-slate-900',
  completed: 'bg-gray-200 text-gray-600',
  no_active_auction: 'bg-blue-100 text-blue-700',
};

function AdminControls({ status, startMut, pauseMut, resumeMut, nextMut, sellMut, unsoldMut, hasPlayer }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Auction Controls</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {status === 'no_active_auction' && (
          <button onClick={() => startMut.mutate()} disabled={startMut.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            🚀 Start Auction
          </button>
        )}
        {(status === 'active' || status === 'paused') && (
          <button onClick={() => nextMut.mutate()} disabled={nextMut.isPending}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            ⏭ Next Player
          </button>
        )}
        {status === 'active' && hasPlayer && (
          <>
            <button onClick={() => sellMut.mutate()} disabled={sellMut.isPending}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              ✅ Sell
            </button>
            <button onClick={() => unsoldMut.mutate()} disabled={unsoldMut.isPending}
              className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors">
              ❌ Unsold
            </button>
          </>
        )}
        {status === 'active' && (
          <button onClick={() => pauseMut.mutate()} disabled={pauseMut.isPending}
            className="px-4 py-2 bg-amber-500 text-slate-900 rounded-xl text-sm font-bold hover:bg-amber-400 disabled:opacity-50 transition-colors">
            ⏸ Pause
          </button>
        )}
        {status === 'paused' && (
          <button onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors">
            ▶️ Resume
          </button>
        )}
      </div>
    </div>
  );
}

// Show ₹ amount without converting to lakhs when < 1L
function fmtBudget(amount) {
  const n = Number(amount);
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function AuctionRoom() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tournamentId = searchParams.get('tournament_id');
  const isAdmin = user?.role === 'admin';
  const qc = useQueryClient();

  const { connected, auctionState, currentPlayer, timer, events, sendBid } = useAuctionWS();
  const [bidLoading, setBidLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);

  const { data: teams = [] } = useQuery({
    queryKey: ['tournament-teams', tournamentId],
    queryFn: () => getTournamentTeams(tournamentId),
    enabled: !!tournamentId,
    refetchInterval: 10_000,
  });

  const { data: tournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => getTournament(tournamentId),
    enabled: !!tournamentId,
  });

  // Any user who owns a team in this tournament can bid
  const myTeam = user ? teams.find((t) => t.owner_id === user.id) : null;
  const isOwner = !!myTeam;
  // Organizer of this tournament OR platform admin can control the auction
  const isOrganizer = !!tournament && !!user && tournament.organizer_id === user.id;
  const bidderTeam = auctionState?.current_bidder_id
    ? teams.find((t) => t.id === auctionState.current_bidder_id)
    : null;

  const onMutError = (e) => setAdminError(e?.response?.data?.detail ?? e?.message ?? 'Action failed');
  const invalidate = {
    onSuccess: () => { setAdminError(null); qc.invalidateQueries(['auction']); },
    onError: onMutError,
  };
  const startMut = useMutation({
    mutationFn: () => startAuction({ timer_seconds: 30, tournament_id: tournamentId }),
    ...invalidate,
  });
  const pauseMut = useMutation({ mutationFn: pauseAuction, ...invalidate });
  const resumeMut = useMutation({ mutationFn: resumeAuction, ...invalidate });
  const nextMut = useMutation({ mutationFn: nextPlayer, ...invalidate });
  const sellMut = useMutation({ mutationFn: sellPlayer, ...invalidate });
  const unsoldMut = useMutation({ mutationFn: unsoldPlayer, ...invalidate });

  const handleBid = (amount) => {
    if (!myTeam) return;
    setBidLoading(true);
    sendBid(myTeam.id, amount);
    setTimeout(() => setBidLoading(false), 1000);
  };

  const visibleEvents = events.filter((e) => EVENT_ICONS[e.type] !== null);
  const status = auctionState?.status ?? 'no_active_auction';

  if (!tournamentId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl">🎙</div>
          <h2 className="text-xl font-bold text-gray-800">Select a tournament first</h2>
          <p className="text-gray-500 text-sm">Auctions are run per tournament. Open a tournament to join its auction.</p>
          <Link to="/tournaments" className="px-5 py-2.5 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 transition-colors">
            Browse Tournaments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      {/* Sub-header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            to={`/tournaments/${tournamentId}`}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {tournament?.name ?? 'Tournament'}
          </Link>
          <span className="text-slate-700">·</span>
          <h1 className="text-lg font-black text-white">Live Auction</h1>
          <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </span>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full capitalize ${STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Player + timer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <AuctionCard
                  player={currentPlayer}
                  currentBid={auctionState?.current_bid}
                  bidderName={bidderTeam?.name}
                  tournamentBasePrice={auctionState?.player_base_price}
                />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center p-6 min-h-[200px] gap-3">
                <TimerRing
                  remaining={timer ?? auctionState?.timer_remaining ?? 0}
                  total={auctionState?.timer_seconds ?? 30}
                />
                {status === 'active' && (
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bidding window</span>
                )}
                {status === 'paused' && (
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">⏸ Paused</span>
                )}
              </div>
            </div>

            {/* Bid button for owners */}
            {isOwner && currentPlayer && status === 'active' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  {myTeam ? (
                    <>
                      <span className="text-sm font-semibold text-gray-700">Bidding as <span className="text-blue-700">{myTeam.name}</span></span>
                      <span className="ml-auto text-xs text-emerald-600 font-bold">{fmtBudget(myTeam.remaining_budget)} available</span>
                    </>
                  ) : (
                    <span className="text-sm text-red-500 font-medium">No team assigned to your account</span>
                  )}
                </div>
                <BidButton
                  currentBid={auctionState?.current_bid}
                  bidIncrement={auctionState?.bid_increment ?? 100}
                  onBid={handleBid}
                  disabled={!connected || !myTeam}
                  loading={bidLoading}
                  remainingBudget={myTeam?.remaining_budget}
                />
              </div>
            )}

            {/* Admin error banner */}
            {adminError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-red-700 text-sm font-medium">⚠️ {adminError}</span>
                <button onClick={() => setAdminError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
              </div>
            )}

            {/* Auction controls — visible to the tournament organizer and platform admins */}
            {(isAdmin || isOrganizer) && (
              <AdminControls
                status={status}
                startMut={startMut} pauseMut={pauseMut} resumeMut={resumeMut}
                nextMut={nextMut} sellMut={sellMut} unsoldMut={unsoldMut}
                hasPlayer={!!currentPlayer}
              />
            )}

            {/* Live event feed */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Live Feed</h3>
              {visibleEvents.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No events yet — waiting for auction to start.</p>
              ) : (
                <ul className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {visibleEvents.map((ev, i) => (
                    <li key={i} className={`flex items-start gap-3 p-3 rounded-xl text-sm ${
                      ev.type === 'PLAYER_SOLD' ? 'bg-emerald-50 border border-emerald-100'
                      : ev.type === 'PLAYER_UNSOLD' ? 'bg-red-50 border border-red-100'
                      : ev.type === 'BID_PLACED' ? 'bg-blue-50 border border-blue-100'
                      : ev.type === 'BID_REJECTED' || ev.type === 'ERROR' ? 'bg-amber-50 border border-amber-100'
                      : 'bg-gray-50'
                    }`}>
                      <span className="text-base shrink-0">{EVENT_ICONS[ev.type]}</span>
                      <span className="text-gray-700 font-medium">
                        {ev.type === 'BID_PLACED' && `₹${Number(ev.current_bid).toLocaleString('en-IN')} bid by ${ev.team_name ?? 'a team'}`}
                        {ev.type === 'PLAYER_UP' && `${ev.player?.name ?? 'Player'} up for auction`}
                        {ev.type === 'PLAYER_SOLD' && `Sold to ${ev.team_name ?? 'Team'} for ₹${Number(ev.sold_price).toLocaleString('en-IN')}`}
                        {ev.type === 'PLAYER_UNSOLD' && 'Player went unsold'}
                        {ev.type === 'AUCTION_STARTED' && 'Auction has started!'}
                        {ev.type === 'AUCTION_PAUSED' && 'Auction paused'}
                        {ev.type === 'AUCTION_RESUMED' && 'Auction resumed'}
                        {ev.type === 'AUCTION_COMPLETED' && '🏁 Auction completed'}
                        {ev.type === 'BID_REJECTED' && `Bid rejected: ${ev.reason ?? 'invalid bid'}`}
                        {ev.type === 'ERROR' && `Error: ${ev.message ?? 'unknown error'}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Sidebar: teams & budgets */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Teams & Budget</h3>
              {teams.length === 0 ? (
                <p className="text-gray-400 text-sm">No teams yet</p>
              ) : (
                <ul className="space-y-4">
                  {teams.map((t) => {
                    const spent = t.total_budget - t.remaining_budget;
                    const pct = t.total_budget > 0 ? (spent / t.total_budget) * 100 : 0;
                    const isMyTeam = myTeam?.id === t.id;
                    return (
                      <li key={t.id} className={`rounded-xl p-3 ${isMyTeam ? 'bg-blue-50 border border-blue-100' : ''}`}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`text-sm font-bold ${isMyTeam ? 'text-blue-800' : 'text-gray-800'}`}>
                            {t.name}
                            {isMyTeam && <span className="ml-1 text-xs text-blue-500">(you)</span>}
                          </span>
                          <span className="text-xs font-semibold text-emerald-600">
                            {fmtBudget(t.remaining_budget)}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{pct.toFixed(0)}% used</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
