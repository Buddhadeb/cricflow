import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NavBar from '../../components/NavBar';
import { useAuthStore } from '../../store/authStore';
import { getMyTeams } from '../../api/teams';
import { getMyPlayers } from '../../api/players';
import {
  getChallenge, acceptChallenge, rejectChallenge,
  pollAvailability, getAvailability, respondAvailability,
} from '../../api/challenges';
import { submitPlayingXI, getPlayingXI } from '../../api/matches';

const STATUS_STYLE = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-500 border-red-200',
};

const AVAIL_STYLE = {
  pending:     { label: '⏳ Pending',      cls: 'bg-gray-100 text-gray-500' },
  available:   { label: '✓ Available',     cls: 'bg-emerald-100 text-emerald-700' },
  unavailable: { label: '✗ Unavailable',   cls: 'bg-red-50 text-red-500' },
};

const TYPE_COLORS = {
  batsman:       'bg-blue-50 text-blue-700',
  bowler:        'bg-red-50 text-red-700',
  all_rounder:   'bg-violet-50 text-violet-700',
  wicket_keeper: 'bg-orange-50 text-orange-700',
};

function PlayingXIPicker({ matchId, teamId, records }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [saved, setSaved] = useState(false);

  const { data: currentXI = [] } = useQuery({
    queryKey: ['playing-xi', matchId, teamId],
    queryFn: () => getPlayingXI(matchId, teamId).then((r) => r.data),
    enabled: !!matchId && !!teamId,
  });

  useEffect(() => {
    if (currentXI.length > 0) {
      setSelected(new Set(currentXI.map((x) => x.player_id)));
    }
  }, [currentXI.length]);

  const xiMut = useMutation({
    mutationFn: () => submitPlayingXI(matchId, { team_id: teamId, player_ids: [...selected] }).then((r) => r.data),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['playing-xi', matchId, teamId] });
    },
  });

  const toggle = (playerId) => {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else if (next.size < 11) next.add(playerId);
      return next;
    });
  };

  const sorted = [...records].sort((a, b) => {
    const order = { available: 0, pending: 1, unavailable: 2 };
    return (order[a.status] ?? 1) - (order[b.status] ?? 1);
  });

  const remaining = 11 - selected.size;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-gray-900 text-sm">Select Playing XI</h4>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          selected.size === 11 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {selected.size} / 11 selected
        </span>
      </div>

      <div className="space-y-1.5 mb-4">
        {sorted.map((rec) => {
          const p = rec.player;
          const isSelected = selected.has(rec.player_id);
          const cantAdd = !isSelected && selected.size >= 11;
          return (
            <div
              key={rec.id}
              onClick={() => { if (!cantAdd) toggle(rec.player_id); }}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-all select-none ${
                isSelected
                  ? 'bg-emerald-50 border border-emerald-200 cursor-pointer'
                  : cantAdd
                    ? 'bg-gray-50 border border-transparent opacity-40 cursor-not-allowed'
                    : 'bg-gray-50 border border-transparent hover:bg-gray-100 cursor-pointer'
              }`}
            >
              {/* Checkbox */}
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-colors ${
                isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'
              }`}>
                {isSelected && <span className="text-xs font-bold leading-none">✓</span>}
              </div>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                {p?.photo_url
                  ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                  : p?.name?.[0] ?? '?'}
              </div>

              {/* Name + type */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p?.name ?? '—'}</p>
                {p?.player_type && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full capitalize ${TYPE_COLORS[p.player_type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.player_type.replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* Availability indicator */}
              <span className={`text-xs font-bold shrink-0 ${
                rec.status === 'available' ? 'text-emerald-500'
                  : rec.status === 'unavailable' ? 'text-red-400'
                  : 'text-gray-400'
              }`}>
                {rec.status === 'available' ? '✓' : rec.status === 'unavailable' ? '✗' : '⏳'}
              </span>
            </div>
          );
        })}
      </div>

      {remaining > 0 && (
        <p className="text-xs text-gray-400 text-center mb-3">
          Pick {remaining} more player{remaining !== 1 ? 's' : ''} to complete your XI
        </p>
      )}

      <button
        onClick={() => xiMut.mutate()}
        disabled={selected.size !== 11 || xiMut.isPending || saved}
        className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm"
      >
        {xiMut.isPending ? 'Saving…'
          : saved ? '✓ Playing XI Confirmed'
          : selected.size === 11 ? 'Confirm Playing XI'
          : `Pick ${remaining} more`}
      </button>

      {xiMut.isError && (
        <p className="text-xs text-red-500 text-center mt-2">
          {xiMut.error?.response?.data?.detail ?? 'Failed to save Playing XI'}
        </p>
      )}
    </div>
  );
}

function AvailabilityCard({
  teamName, teamId, matchId, challengeId,
  records, isCaptain, pollMut,
}) {
  const available = records.filter((r) => r.status === 'available').length;
  const total = records.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">{teamName} — Availability</h3>
        {isCaptain && (
          <button
            onClick={() => pollMut.mutate(teamId)}
            disabled={pollMut.isPending && pollMut.variables === teamId}
            className="px-3 py-1.5 bg-amber-400 text-slate-900 text-xs font-bold rounded-lg hover:bg-amber-300 transition-colors disabled:opacity-50"
          >
            {pollMut.isPending && pollMut.variables === teamId ? '…' : 'Poll Squad'}
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          No availability records yet — captain needs to poll the squad.
        </p>
      ) : (
        <>
          {/* Progress */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-semibold text-gray-700">{available}/{total} available</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${total ? (available / total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Availability list */}
          <div className="divide-y divide-gray-50">
            {records.map((rec) => {
              const st = AVAIL_STYLE[rec.status] ?? AVAIL_STYLE.pending;
              const p = rec.player;
              return (
                <div key={rec.id} className="flex items-center gap-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                    {p?.photo_url
                      ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                      : p?.name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{p?.name ?? '—'}</p>
                    {p?.player_type && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full capitalize ${TYPE_COLORS[p.player_type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.player_type.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                </div>
              );
            })}
          </div>

          {/* Playing XI picker — only for captain */}
          {isCaptain && (
            <PlayingXIPicker matchId={matchId} teamId={teamId} records={records} />
          )}
        </>
      )}
    </div>
  );
}

export default function ChallengeDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: challenge, isLoading } = useQuery({
    queryKey: ['challenge', id],
    queryFn: () => getChallenge(id),
  });

  const { data: myTeams = [] } = useQuery({
    queryKey: ['my-teams'],
    queryFn: getMyTeams,
    enabled: !!user,
  });

  const { data: myPlayers = [] } = useQuery({
    queryKey: ['my-players'],
    queryFn: getMyPlayers,
    enabled: !!user,
  });

  const myTeamIds = myTeams.map((t) => t.id);
  const myPlayerIds = new Set(myPlayers.map((p) => p.id));
  const isCaptainA = challenge && myTeamIds.includes(challenge.team_a_id);
  const isCaptainB = challenge && myTeamIds.includes(challenge.team_b_id);

  const { data: availA = [] } = useQuery({
    queryKey: ['availability', id, challenge?.team_a_id],
    queryFn: () => getAvailability(id, challenge.team_a_id),
    enabled: !!challenge?.match_id && !!challenge?.team_a_id,
    refetchInterval: 15_000,
  });

  const { data: availB = [] } = useQuery({
    queryKey: ['availability', id, challenge?.team_b_id],
    queryFn: () => getAvailability(id, challenge.team_b_id),
    enabled: !!challenge?.match_id && !!challenge?.team_b_id,
    refetchInterval: 15_000,
  });

  const acceptMut = useMutation({
    mutationFn: () => acceptChallenge(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challenge', id] }),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectChallenge(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['challenges'] }); navigate('/challenges'); },
  });

  const pollMut = useMutation({
    mutationFn: (teamId) => pollAvailability(id, teamId),
    onSuccess: (_, teamId) => qc.invalidateQueries({ queryKey: ['availability', id, teamId] }),
  });

  const respondMut = useMutation({
    mutationFn: (status) => respondAvailability(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability', id, challenge?.team_a_id] });
      qc.invalidateQueries({ queryKey: ['availability', id, challenge?.team_b_id] });
    },
  });

  // Find my availability record (works for both captains and players)
  const allRecords = [...availA, ...availB];
  const myAvailRecord = allRecords.find((r) => myPlayerIds.has(r.player_id));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50"><NavBar />
        <div className="flex justify-center py-32">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }
  if (!challenge) return null;

  const st = STATUS_STYLE[challenge.status] ?? STATUS_STYLE.pending;
  const prize = challenge.prize_amount ? `₹${Number(challenge.prize_amount).toLocaleString('en-IN')}` : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/challenges" className="text-sm text-amber-600 font-semibold hover:underline flex items-center gap-1 mb-6">
          ← All Challenges
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${st}`}>
              {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
            </span>
            {prize && (
              <div className="text-center">
                <p className="text-xs text-gray-400 font-medium">Prize</p>
                <p className="text-xl font-black text-emerald-600">{prize}</p>
              </div>
            )}
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              {challenge.team_a?.logo_url ? (
                <img src={challenge.team_a.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-2" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-2xl mx-auto mb-2">
                  {challenge.team_a?.name?.[0]}
                </div>
              )}
              <p className="font-black text-gray-900">{challenge.team_a?.name}</p>
              {isCaptainA && <p className="text-xs text-amber-600 font-semibold mt-0.5">Your Team</p>}
            </div>
            <div className="text-center shrink-0">
              <p className="text-2xl font-black text-gray-200">VS</p>
              <p className="text-xs text-gray-400 mt-1">{challenge.overs} overs</p>
            </div>
            <div className="flex-1 text-center">
              {challenge.team_b?.logo_url ? (
                <img src={challenge.team_b.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-2" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-2xl mx-auto mb-2">
                  {challenge.team_b?.name?.[0]}
                </div>
              )}
              <p className="font-black text-gray-900">{challenge.team_b?.name}</p>
              {isCaptainB && <p className="text-xs text-amber-600 font-semibold mt-0.5">Your Team</p>}
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400">
            {challenge.venue && <span>📍 {challenge.venue}</span>}
            {challenge.match_date && (
              <span>📅 {new Date(challenge.match_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>

          {/* Accept / Decline for team B captain */}
          {isCaptainB && challenge.status === 'pending' && (
            <div className="flex gap-3 mt-5 pt-5 border-t border-gray-50">
              <button
                onClick={() => { if (window.confirm('Accept this challenge?')) acceptMut.mutate(); }}
                disabled={acceptMut.isPending}
                className="flex-1 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {acceptMut.isPending ? 'Accepting…' : '✓ Accept Challenge'}
              </button>
              <button
                onClick={() => { if (window.confirm('Decline this challenge?')) rejectMut.mutate(); }}
                disabled={rejectMut.isPending}
                className="px-5 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {rejectMut.isPending ? '…' : 'Decline'}
              </button>
            </div>
          )}

          {/* Match link */}
          {challenge.status === 'accepted' && challenge.match_id && (
            <div className="mt-5 pt-5 border-t border-gray-50 flex items-center justify-between">
              <p className="text-sm font-semibold text-emerald-700">✓ Match created</p>
              <Link to={`/matches/${challenge.match_id}`} className="text-sm font-bold text-blue-600 hover:underline">
                Open Match →
              </Link>
            </div>
          )}
        </div>

        {/* Availability — only after accepted */}
        {challenge.status === 'accepted' && challenge.match_id && (
          <div className="space-y-4">
            {/* My availability response — shown to anyone with a record in this match */}
            {myAvailRecord && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">Your Availability</h3>
                  {myAvailRecord.status !== 'pending' && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${AVAIL_STYLE[myAvailRecord.status]?.cls ?? AVAIL_STYLE.pending.cls}`}>
                      {AVAIL_STYLE[myAvailRecord.status]?.label ?? '⏳ Pending'}
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => respondMut.mutate('available')}
                    disabled={respondMut.isPending || myAvailRecord.status === 'available'}
                    className={`flex-1 py-2.5 font-bold rounded-xl transition-colors disabled:opacity-50 text-sm ${
                      myAvailRecord.status === 'available'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    }`}
                  >
                    ✓ I'm Available
                  </button>
                  <button
                    onClick={() => respondMut.mutate('unavailable')}
                    disabled={respondMut.isPending || myAvailRecord.status === 'unavailable'}
                    className={`flex-1 py-2.5 font-bold rounded-xl transition-colors disabled:opacity-50 text-sm ${
                      myAvailRecord.status === 'unavailable'
                        ? 'bg-gray-400 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ✗ Not Available
                  </button>
                </div>
                {respondMut.isSuccess && (
                  <p className="text-xs text-emerald-600 font-semibold mt-2 text-center">Response saved!</p>
                )}
              </div>
            )}

            {/* Team A availability + Playing XI */}
            <AvailabilityCard
              teamName={challenge.team_a?.name}
              teamId={challenge.team_a_id}
              matchId={challenge.match_id}
              challengeId={id}
              records={availA}
              isCaptain={isCaptainA}
              pollMut={pollMut}
            />

            {/* Team B availability + Playing XI */}
            <AvailabilityCard
              teamName={challenge.team_b?.name}
              teamId={challenge.team_b_id}
              matchId={challenge.match_id}
              challengeId={id}
              records={availB}
              isCaptain={isCaptainB}
              pollMut={pollMut}
            />
          </div>
        )}
      </div>
    </div>
  );
}
