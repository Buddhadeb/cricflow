import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getScorecard } from '../../api/scoring';
import { getMatch, completeMatch, recordToss, startMatch, submitPlayingXI } from '../../api/matches';
import { getTournament, getTournamentTeams } from '../../api/tournaments';
import client from '../../api/client';
import ScoreBoard from '../../components/ScoreBoard';
import { useScoringWS } from '../../hooks/useScoringWS';
import { useAuthStore } from '../../store/authStore';
import NavBar from '../../components/NavBar';

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_CONFIG = {
  scheduled: { label: 'Upcoming', bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-400' },
  live: { label: '● LIVE', bg: 'bg-green-100 text-green-700 animate-pulse', dot: 'bg-green-500' },
  completed: { label: 'Completed', bg: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50 text-red-500', dot: 'bg-red-400' },
};

function FormCard({ title, color = 'gray', children }) {
  const colors = {
    yellow: 'bg-amber-50 border-amber-200',
    blue: 'bg-blue-50 border-blue-200',
    gray: 'bg-gray-50 border-gray-200',
  };
  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${colors[color] ?? colors.gray}`}>
      <h4 className="font-bold text-gray-800">{title}</h4>
      {children}
    </div>
  );
}

function TossForm({ match, teams, onSuccess }) {
  const [winnerId, setWinnerId] = useState('');
  const [decision, setDecision] = useState('bat');
  const mut = useMutation({
    mutationFn: () => recordToss(match.id, { toss_winner_id: winnerId, toss_decision: decision }),
    onSuccess,
  });

  return (
    <FormCard title="Record Toss" color="yellow">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Toss Winner</label>
          <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)}
            className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
            <option value="">— select —</option>
            {[match.team_a_id, match.team_b_id].map((tid) => (
              <option key={tid} value={tid}>{teams.find((t) => t.id === tid)?.name ?? tid}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Decision</label>
          <select value={decision} onChange={(e) => setDecision(e.target.value)}
            className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
            <option value="bat">Bat first</option>
            <option value="bowl">Bowl first</option>
          </select>
        </div>
      </div>
      {mut.isError && <p className="text-red-500 text-xs">{mut.error?.response?.data?.detail ?? 'Error'}</p>}
      <button onClick={() => mut.mutate()} disabled={!winnerId || mut.isPending}
        className="px-5 py-2.5 bg-amber-500 text-slate-900 text-sm font-bold rounded-xl hover:bg-amber-400 disabled:opacity-50 transition-colors">
        {mut.isPending ? 'Saving…' : 'Save Toss'}
      </button>
    </FormCard>
  );
}

function PlayingXIForm({ matchId, teams, onSuccess }) {
  const [teamId, setTeamId] = useState('');
  const [squadData, setSquadData] = useState([]);
  const [selected, setSelected] = useState([]);

  const loadSquad = async (tid) => {
    setTeamId(tid);
    if (!tid) return;
    const r = await client.get(`/teams/${tid}/squad`);
    setSquadData(r.data);
    setSelected([]);
  };

  const togglePlayer = (pid) => {
    setSelected((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : prev.length < 11 ? [...prev, pid] : prev
    );
  };

  const mut = useMutation({
    mutationFn: () => submitPlayingXI(matchId, { team_id: teamId, player_ids: selected }),
    onSuccess,
  });

  return (
    <FormCard title="Set Playing XI" color="blue">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Team</label>
        <select value={teamId} onChange={(e) => { loadSquad(e.target.value); setSelected([]); }}
          className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">— select team —</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {squadData.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">
            Select 11 players
            <span className={`ml-1 ${selected.length === 11 ? 'text-emerald-600' : 'text-gray-400'}`}>({selected.length}/11)</span>
          </p>
          <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto rounded-xl">
            {squadData.map((tp) => (
              <label key={tp.player_id}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer border transition-colors ${
                  selected.includes(tp.player_id)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-200 hover:border-blue-300'
                }`}>
                <input type="checkbox" checked={selected.includes(tp.player_id)}
                  onChange={() => togglePlayer(tp.player_id)} className="sr-only" />
                <span className="truncate font-medium">{tp.player?.name ?? tp.player_id.slice(0, 8)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {mut.isError && <p className="text-red-500 text-xs">{mut.error?.response?.data?.detail ?? 'Error'}</p>}
      <button onClick={() => mut.mutate()} disabled={!teamId || selected.length === 0 || mut.isPending}
        className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {mut.isPending ? 'Saving…' : `Save XI (${selected.length} players)`}
      </button>
    </FormCard>
  );
}

function CompleteForm({ matchId, teams, onSuccess }) {
  const [winnerId, setWinnerId] = useState('');
  const [summary, setSummary] = useState('');
  const mut = useMutation({
    mutationFn: () => completeMatch(matchId, { winner_id: winnerId || null, result_summary: summary }),
    onSuccess,
  });

  return (
    <FormCard title="Complete Match" color="gray">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Winner (leave blank for no result)</label>
        <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
          <option value="">No result / Tie</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <input placeholder="Result summary (e.g. CSK won by 5 wickets)"
        value={summary} onChange={(e) => setSummary(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
      {mut.isError && <p className="text-red-500 text-xs">{mut.error?.response?.data?.detail ?? 'Error'}</p>}
      <button onClick={() => mut.mutate()} disabled={!summary || mut.isPending}
        className="px-5 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-colors">
        {mut.isPending ? 'Saving…' : 'Mark Complete'}
      </button>
    </FormCard>
  );
}

export default function MatchDetail() {
  const { matchId } = useParams();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const isAdmin = user?.role === 'admin';

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => getMatch(matchId).then((r) => r.data),
  });

  const tournamentId = match?.tournament_id;

  const { data: tournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => getTournament(tournamentId),
    enabled: !!tournamentId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['tournament-teams', tournamentId],
    queryFn: () => getTournamentTeams(tournamentId),
    enabled: !!tournamentId,
  });

  const isOrganizer = !!tournament && !!user && tournament.organizer_id === user.id;
  const isScorer = isAdmin || isOrganizer;

  const isLive = match?.status === 'live';

  const { data: scorecard, refetch: refetchScorecard } = useQuery({
    queryKey: ['scorecard', matchId],
    queryFn: () => getScorecard(matchId).then((r) => r.data),
    enabled: match?.status === 'live' || match?.status === 'completed',
  });

  const { lastEvent } = useScoringWS(isLive ? matchId : null);
  useEffect(() => {
    if (lastEvent) refetchScorecard();
  }, [lastEvent, refetchScorecard]);

  const invalidate = () => qc.invalidateQueries(['match', matchId]);
  const startMut = useMutation({ mutationFn: () => startMatch(matchId), onSuccess: invalidate });

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
  if (!match) return null;

  const teamA = teams.find((t) => t.id === match.team_a_id);
  const teamB = teams.find((t) => t.id === match.team_b_id);
  const tossWinner = teams.find((t) => t.id === match.toss_winner_id);
  const matchTeams = teams.filter((t) => [match.team_a_id, match.team_b_id].includes(t.id));
  const statusCfg = STATUS_CONFIG[match.status] ?? STATUS_CONFIG.scheduled;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      {/* Match hero header */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-2 mb-5">
            <Link
              to={tournamentId ? `/tournaments/${tournamentId}` : '/tournaments'}
              className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {tournament?.name ?? 'Tournament'}
            </Link>
            <span className="text-slate-700">/</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusCfg.bg}`}>{statusCfg.label}</span>
          </div>

          {/* Teams VS display */}
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 text-center">
              {teamA?.logo_url ? (
                <img src={teamA.logo_url} alt={teamA.name} className="w-14 h-14 rounded-full mx-auto mb-2 shadow-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white text-xl font-black mx-auto mb-2">
                  {teamA?.name?.[0] ?? '?'}
                </div>
              )}
              <p className="text-white font-black text-lg">{teamA?.name ?? 'TBD'}</p>
              {match.winner_id === teamA?.id && <p className="text-amber-400 text-xs font-bold mt-0.5">Winner 🏆</p>}
            </div>

            <div className="text-center shrink-0">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">vs</p>
              <p className="text-slate-500 text-xs">{match.total_overs} ov</p>
            </div>

            <div className="flex-1 text-center">
              {teamB?.logo_url ? (
                <img src={teamB.logo_url} alt={teamB.name} className="w-14 h-14 rounded-full mx-auto mb-2 shadow-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white text-xl font-black mx-auto mb-2">
                  {teamB?.name?.[0] ?? '?'}
                </div>
              )}
              <p className="text-white font-black text-lg">{teamB?.name ?? 'TBD'}</p>
              {match.winner_id === teamB?.id && <p className="text-amber-400 text-xs font-bold mt-0.5">Winner 🏆</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 space-y-5 mt-5">
        {/* Match info card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Date &amp; Time</p>
            <p className="font-semibold text-gray-800">{formatDate(match.match_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Venue</p>
            <p className="font-semibold text-gray-800">{match.venue}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Stage</p>
            <p className="font-semibold text-gray-800 capitalize">{match.stage?.replace('_', ' ')}</p>
          </div>
          {match.toss_winner_id && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Toss</p>
              <p className="font-semibold text-gray-800">{tossWinner?.name} elected to {match.toss_decision}</p>
            </div>
          )}
          {match.result_summary && (
            <div className="col-span-2 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Result</p>
              <p className="font-bold text-emerald-700">{match.result_summary}</p>
            </div>
          )}
        </div>

        {/* Live scorecard */}
        {(match.status === 'live' || match.status === 'completed') && (
          <div>
            {isScorer && match.status === 'live' && (
              <div className="mb-3 flex justify-end">
                <Link to={`/scoring/${matchId}`}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-colors">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Enter Scoring
                </Link>
              </div>
            )}
            <ScoreBoard scorecard={scorecard} matchStatus={match.status} />
          </div>
        )}

        {/* Admin / scorer controls */}
        {isScorer && match.status === 'scheduled' && (
          <div className="space-y-4">
            {!match.toss_winner_id && (
              <TossForm match={match} teams={matchTeams} onSuccess={invalidate} />
            )}
            {match.toss_winner_id && (
              <PlayingXIForm matchId={matchId} teams={matchTeams} onSuccess={invalidate} />
            )}
            {match.toss_winner_id && (
              <div className="flex justify-end">
                <button onClick={() => startMut.mutate()} disabled={startMut.isPending}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-green-200 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {startMut.isPending ? 'Starting…' : 'Start Match'}
                </button>
              </div>
            )}
          </div>
        )}

        {isScorer && match.status === 'live' && (
          <CompleteForm matchId={matchId} teams={matchTeams} onSuccess={invalidate} />
        )}
      </div>
    </div>
  );
}
