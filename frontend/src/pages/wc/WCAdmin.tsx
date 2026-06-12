import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import wcService, {
  type Team, type Match, type PointsConfig, type TournamentResult, type WCGroup,
  type TeamRankingResult,
} from '../../services/wcService';
import WCLayout from './WCLayout';
import { useAuth } from '../../context/AuthContext';

type AdminTab = 'groups' | 'teams' | 'matches' | 'results' | 'config' | 'tournament' | 'rankings';

const STAGES = [
  { value: 'group', label: 'Group Stage' },
  { value: 'r16', label: 'Round of 16' },
  { value: 'qf', label: 'Quarter Final' },
  { value: 'sf', label: 'Semi Final' },
  { value: '3rd', label: '3rd Place Play-off' },
  { value: 'final', label: 'Final' },
];

const WCAdmin: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('teams');

  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamForm, setTeamForm] = useState({ name: '', flag: '', group: '' });
  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [teamSaving, setTeamSaving] = useState(false);

  // Groups state
  const [groups, setGroups] = useState<WCGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupSaving, setGroupSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Matches state
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchForm, setMatchForm] = useState({
    home_team_id: '',
    away_team_id: '',
    match_time: '',
    stage: 'group',
    venue: '',
    match_number: '',
  });
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [matchSaving, setMatchSaving] = useState(false);
  const [showMatchForm, setShowMatchForm] = useState(false);

  // Results state
  const [resultInputs, setResultInputs] = useState<Map<number, { home: string; away: string; penalty_winner_id: string }>>(new Map());
  const [resultSaving, setResultSaving] = useState<Set<number>>(new Set());

  // Points config
  const [configForm, setConfigForm] = useState<Partial<PointsConfig>>({});
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  // Tournament result
  const [tournResult, setTournResult] = useState<TournamentResult | null>(null);
  const [tournWinnerId, setTournWinnerId] = useState<string>('');
  const [tournRunnerUpId, setTournRunnerUpId] = useState<string>('');
  const [tournIsFinal, setTournIsFinal] = useState(false);
  const [tournSaving, setTournSaving] = useState(false);
  const [tournSaved, setTournSaved] = useState(false);

  // Team ranking result
  const [rankResult, setRankResult] = useState<TeamRankingResult | null>(null);
  const [rankForm, setRankForm] = useState({ rank_1_id: '', rank_2_id: '', rank_3_id: '', final_score_1: '', final_score_2: '', is_final: false });
  const [rankSaving, setRankSaving] = useState(false);
  const [rankSaved, setRankSaved] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user?.is_staff) {
      navigate('/wc');
      return;
    }
    loadAll();
  }, [isAuthenticated, user]);

  const loadAll = async () => {
    try {
      const [ts, ms, cfg, tr, gs, rr] = await Promise.all([
        wcService.getTeams(),
        wcService.getMatches(),
        wcService.getPointsConfig(),
        wcService.getTournamentResult(),
        wcService.getGroups(),
        wcService.getRankingResult(),
      ]);
      setTeams(ts);
      setMatches(ms);
      setGroups(gs);
      setConfigForm(cfg);
      setTournResult(tr);
      if (tr) {
        setTournWinnerId(String(tr.winner?.id ?? ''));
        setTournRunnerUpId(String(tr.runner_up?.id ?? ''));
        setTournIsFinal(tr.is_final);
      }
      setRankResult(rr);
      if (rr) {
        setRankForm({
          rank_1_id: String(rr.rank_1?.id ?? ''),
          rank_2_id: String(rr.rank_2?.id ?? ''),
          rank_3_id: String(rr.rank_3?.id ?? ''),
          final_score_1: rr.final_score_1 !== null ? String(rr.final_score_1) : '',
          final_score_2: rr.final_score_2 !== null ? String(rr.final_score_2) : '',
          is_final: rr.is_final,
        });
      }
      // Initialize result inputs
      const ri = new Map<number, { home: string; away: string; penalty_winner_id: string }>();
      ms.forEach(m => {
        if (!m.is_completed) ri.set(m.id, { home: '', away: '', penalty_winner_id: '' });
      });
      setResultInputs(ri);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  // ── Groups ───────────────────────────────────────────────────────────────
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) { setError('Group name is required.'); return; }
    setError(null);
    setGroupSaving(true);
    try {
      const created = await wcService.createGroup(newGroupName.trim());
      setGroups(prev => [created, ...prev]);
      setNewGroupName('');
    } catch {
      setError('Failed to create group.');
    } finally {
      setGroupSaving(false);
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm('Delete this group? Members will lose access.')) return;
    try {
      await wcService.deleteGroup(id);
      setGroups(prev => prev.filter(g => g.id !== id));
    } catch {
      setError('Failed to delete group.');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ── Teams ────────────────────────────────────────────────────────────────
  const handleTeamSave = async () => {
    if (!teamForm.name.trim()) { setError('Team name is required.'); return; }
    setError(null);
    setTeamSaving(true);
    try {
      if (editingTeam !== null) {
        const updated = await wcService.updateTeam(editingTeam, teamForm);
        setTeams(prev => prev.map(t => t.id === editingTeam ? updated : t));
      } else {
        const created = await wcService.createTeam(teamForm);
        setTeams(prev => [...prev, created]);
      }
      setTeamForm({ name: '', flag: '', group: '' });
      setEditingTeam(null);
    } catch (e: any) {
      setError(e.response?.data?.name?.[0] || 'Failed to save team.');
    } finally {
      setTeamSaving(false);
    }
  };

  const handleTeamEdit = (team: Team) => {
    setEditingTeam(team.id);
    setTeamForm({ name: team.name, flag: team.flag, group: team.group });
  };

  const handleTeamDelete = async (id: number) => {
    if (!confirm('Delete this team? This will also remove all related matches.')) return;
    try {
      await wcService.deleteTeam(id);
      setTeams(prev => prev.filter(t => t.id !== id));
    } catch {
      setError('Failed to delete team.');
    }
  };

  // ── Matches ──────────────────────────────────────────────────────────────
  const handleMatchSave = async () => {
    if (!matchForm.home_team_id || !matchForm.away_team_id || !matchForm.match_time) {
      setError('Home team, away team, and match time are required.');
      return;
    }
    if (matchForm.home_team_id === matchForm.away_team_id) {
      setError('Home and away teams must be different.');
      return;
    }
    setError(null);
    setMatchSaving(true);
    try {
      const payload = {
        home_team_id: parseInt(matchForm.home_team_id),
        away_team_id: parseInt(matchForm.away_team_id),
        match_time: matchForm.match_time,
        stage: matchForm.stage,
        venue: matchForm.venue,
        match_number: matchForm.match_number ? parseInt(matchForm.match_number) : null,
      };
      if (editingMatch !== null) {
        const updated = await wcService.updateMatch(editingMatch, payload);
        setMatches(prev => prev.map(m => m.id === editingMatch ? updated : m));
      } else {
        const created = await wcService.createMatch(payload as any);
        setMatches(prev => [...prev, created]);
      }
      setMatchForm({ home_team_id: '', away_team_id: '', match_time: '', stage: 'group', venue: '', match_number: '' });
      setEditingMatch(null);
      setShowMatchForm(false);
    } catch (e: any) {
      setError(e.response?.data?.non_field_errors?.[0] || 'Failed to save match.');
    } finally {
      setMatchSaving(false);
    }
  };

  const handleMatchEdit = (match: Match) => {
    setEditingMatch(match.id);
    setMatchForm({
      home_team_id: String(match.home_team.id),
      away_team_id: String(match.away_team.id),
      match_time: match.match_time.slice(0, 16),
      stage: match.stage,
      venue: match.venue || '',
      match_number: String(match.match_number ?? ''),
    });
    setShowMatchForm(true);
    setTab('matches');
  };

  const handleMatchDelete = async (id: number) => {
    if (!confirm('Delete this match and all predictions?')) return;
    try {
      await wcService.deleteMatch(id);
      setMatches(prev => prev.filter(m => m.id !== id));
    } catch {
      setError('Failed to delete match.');
    }
  };

  // ── Results ──────────────────────────────────────────────────────────────
  const KNOCKOUT_STAGES = new Set(['r16', 'qf', 'sf', '3rd', 'final']);

  const handleResultSave = async (matchId: number) => {
    const inp = resultInputs.get(matchId);
    if (!inp) return;
    const home = parseInt(inp.home);
    const away = parseInt(inp.away);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setError('Enter valid non-negative scores.');
      return;
    }
    const match = matches.find(m => m.id === matchId);
    const isKnockout = match && KNOCKOUT_STAGES.has(match.stage);
    const penaltyWinnerId = isKnockout && home === away && inp.penalty_winner_id
      ? parseInt(inp.penalty_winner_id) : null;
    setError(null);
    setResultSaving(prev => new Set(prev).add(matchId));
    try {
      const updated = await wcService.setResult(matchId, home, away, penaltyWinnerId);
      setMatches(prev => prev.map(m => m.id === matchId ? updated : m));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to set result.');
    } finally {
      setResultSaving(prev => { const n = new Set(prev); n.delete(matchId); return n; });
    }
  };

  // ── Config ───────────────────────────────────────────────────────────────
  const handleConfigSave = async () => {
    setConfigSaving(true);
    try {
      const saved = await wcService.updatePointsConfig(configForm);
      setConfigForm(saved);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
    } catch {
      setError('Failed to save config.');
    } finally {
      setConfigSaving(false);
    }
  };

  // ── Ranking result ───────────────────────────────────────────────────────
  const handleRankSave = async () => {
    setRankSaving(true);
    try {
      const payload = {
        rank_1_id: rankForm.rank_1_id ? parseInt(rankForm.rank_1_id) : null,
        rank_2_id: rankForm.rank_2_id ? parseInt(rankForm.rank_2_id) : null,
        rank_3_id: rankForm.rank_3_id ? parseInt(rankForm.rank_3_id) : null,
        final_score_1: rankForm.final_score_1 !== '' ? parseInt(rankForm.final_score_1) : null,
        final_score_2: rankForm.final_score_2 !== '' ? parseInt(rankForm.final_score_2) : null,
        is_final: rankForm.is_final,
      };
      const saved = await wcService.setRankingResult(payload);
      setRankResult(saved);
      setRankSaved(true);
      setTimeout(() => setRankSaved(false), 3000);
    } catch {
      setError('Failed to save ranking result.');
    } finally {
      setRankSaving(false);
    }
  };

  // ── Tournament result ────────────────────────────────────────────────────
  const handleTournSave = async () => {
    setTournSaving(true);
    try {
      const saved = await wcService.setTournamentResult(
        tournWinnerId ? parseInt(tournWinnerId) : null,
        tournRunnerUpId ? parseInt(tournRunnerUpId) : null,
        tournIsFinal,
      );
      setTournResult(saved);
      setTournSaved(true);
      setTimeout(() => setTournSaved(false), 3000);
    } catch {
      setError('Failed to save tournament result.');
    } finally {
      setTournSaving(false);
    }
  };

  if (loading) {
    return (
      <WCLayout>
        <div className="wc-loading"><div className="wc-spinner" /></div>
      </WCLayout>
    );
  }

  return (
    <WCLayout>
      <div className="wc-page">
        <div className="wc-page-header">
          <h1 className="wc-page-title">⚙️ Admin Panel</h1>
          <p className="wc-page-subtitle">Manage teams, matches, results, and points configuration</p>
        </div>

        {error && (
          <div className="wc-alert wc-alert-error">
            <span>⚠</span><span>{error}</span>
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className="wc-admin-tabs">
          {(['groups', 'teams', 'matches', 'results', 'rankings', 'tournament', 'config'] as AdminTab[]).map(t => (
            <button key={t} className={`wc-admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {{ groups: '👥 Groups', teams: '🌍 Teams', matches: '⚽ Matches', results: '📊 Results', rankings: '🏅 Rankings', tournament: '🏆 Tournament', config: '⭐ Points Config' }[t]}
            </button>
          ))}
        </div>

        {/* ── Groups ── */}
        {tab === 'groups' && (
          <div>
            <div className="wc-card" style={{ marginBottom: 20 }}>
              <div className="wc-card-title">Create New Group</div>
              <p style={{ fontSize: 13, color: 'var(--wc-text-muted)', marginBottom: 16 }}>
                Each group gets a unique 6-character code. Share it with friends so they can join.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  className="wc-input"
                  placeholder="Group name, e.g. Office League"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                  style={{ flex: 1 }}
                />
                <button className="wc-btn wc-btn-primary" disabled={groupSaving} onClick={handleCreateGroup}>
                  {groupSaving ? '…' : '+ Create'}
                </button>
              </div>
            </div>

            <div className="wc-card">
              <div className="wc-card-title">Groups ({groups.length})</div>
              {groups.length === 0 ? (
                <div className="wc-empty">No groups yet. Create one above.</div>
              ) : (
                <table className="wc-table">
                  <thead>
                    <tr><th>Name</th><th>Join Code</th><th>Members</th><th>Created</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {groups.map(g => (
                      <tr key={g.id}>
                        <td style={{ fontWeight: 600 }}>{g.name}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, letterSpacing: 4, color: 'var(--wc-gold)' }}>
                              {g.code}
                            </span>
                            <button
                              className="wc-btn wc-btn-sm wc-btn-secondary"
                              onClick={() => handleCopyCode(g.code)}
                            >
                              {copiedCode === g.code ? '✓ Copied' : '📋 Copy'}
                            </button>
                          </div>
                        </td>
                        <td>{g.member_count}</td>
                        <td style={{ fontSize: 12, color: 'var(--wc-text-muted)' }}>
                          {new Date(g.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <button className="wc-btn wc-btn-sm wc-btn-danger" onClick={() => handleDeleteGroup(g.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── Teams ── */}
        {tab === 'teams' && (
          <div>
            <div className="wc-card" style={{ marginBottom: 20 }}>
              <div className="wc-card-title">{editingTeam !== null ? 'Edit Team' : 'Add New Team'}</div>
              <div className="wc-form-row">
                <div className="wc-form-group">
                  <label className="wc-label">Team Name *</label>
                  <input className="wc-input" placeholder="e.g. Brazil" value={teamForm.name} onChange={e => setTeamForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="wc-form-group">
                  <label className="wc-label">Flag Emoji</label>
                  <input className="wc-input" placeholder="🇧🇷" value={teamForm.flag} onChange={e => setTeamForm(p => ({ ...p, flag: e.target.value }))} />
                </div>
                <div className="wc-form-group">
                  <label className="wc-label">Group</label>
                  <input className="wc-input" placeholder="A" maxLength={2} value={teamForm.group} onChange={e => setTeamForm(p => ({ ...p, group: e.target.value.toUpperCase() }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="wc-btn wc-btn-primary" disabled={teamSaving} onClick={handleTeamSave}>
                  {teamSaving ? '…' : editingTeam !== null ? 'Update' : 'Add Team'}
                </button>
                {editingTeam !== null && (
                  <button className="wc-btn wc-btn-secondary" onClick={() => { setEditingTeam(null); setTeamForm({ name: '', flag: '', group: '' }); }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="wc-card">
              <div className="wc-card-title">Teams ({teams.length})</div>
              {teams.length === 0 ? <div className="wc-empty">No teams yet.</div> : (
                <table className="wc-table">
                  <thead><tr><th>Flag</th><th>Name</th><th>Group</th><th>Actions</th></tr></thead>
                  <tbody>
                    {teams.map(team => (
                      <tr key={team.id}>
                        <td style={{ fontSize: 22 }}>{team.flag}</td>
                        <td style={{ fontWeight: 600 }}>{team.name}</td>
                        <td>{team.group || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="wc-btn wc-btn-sm wc-btn-secondary" onClick={() => handleTeamEdit(team)}>Edit</button>
                            <button className="wc-btn wc-btn-sm wc-btn-danger" onClick={() => handleTeamDelete(team.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── Matches ── */}
        {tab === 'matches' && (
          <div>
            {(showMatchForm || editingMatch !== null) ? (
              <div className="wc-card" style={{ marginBottom: 20 }}>
                <div className="wc-card-title">{editingMatch !== null ? 'Edit Match' : 'Add New Match'}</div>
                <div className="wc-form-row">
                  <div className="wc-form-group">
                    <label className="wc-label">Home Team *</label>
                    <select className="wc-select" style={{ width: '100%' }} value={matchForm.home_team_id} onChange={e => setMatchForm(p => ({ ...p, home_team_id: e.target.value }))}>
                      <option value="">Select team…</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
                    </select>
                  </div>
                  <div className="wc-form-group">
                    <label className="wc-label">Away Team *</label>
                    <select className="wc-select" style={{ width: '100%' }} value={matchForm.away_team_id} onChange={e => setMatchForm(p => ({ ...p, away_team_id: e.target.value }))}>
                      <option value="">Select team…</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="wc-form-row">
                  <div className="wc-form-group">
                    <label className="wc-label">Match Date & Time *</label>
                    <input className="wc-input" type="datetime-local" value={matchForm.match_time} onChange={e => setMatchForm(p => ({ ...p, match_time: e.target.value }))} />
                  </div>
                  <div className="wc-form-group">
                    <label className="wc-label">Stage</label>
                    <select className="wc-select" style={{ width: '100%' }} value={matchForm.stage} onChange={e => setMatchForm(p => ({ ...p, stage: e.target.value }))}>
                      {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="wc-form-row">
                  <div className="wc-form-group">
                    <label className="wc-label">Venue</label>
                    <input className="wc-input" placeholder="e.g. Lusail Stadium" value={matchForm.venue} onChange={e => setMatchForm(p => ({ ...p, venue: e.target.value }))} />
                  </div>
                  <div className="wc-form-group">
                    <label className="wc-label">Match Number</label>
                    <input className="wc-input" type="number" placeholder="1" value={matchForm.match_number} onChange={e => setMatchForm(p => ({ ...p, match_number: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="wc-btn wc-btn-primary" disabled={matchSaving} onClick={handleMatchSave}>
                    {matchSaving ? '…' : editingMatch !== null ? 'Update Match' : 'Add Match'}
                  </button>
                  <button className="wc-btn wc-btn-secondary" onClick={() => { setShowMatchForm(false); setEditingMatch(null); setMatchForm({ home_team_id: '', away_team_id: '', match_time: '', stage: 'group', venue: '', match_number: '' }); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <button className="wc-btn wc-btn-primary" onClick={() => setShowMatchForm(true)}>+ Add Match</button>
              </div>
            )}

            <div className="wc-card">
              <div className="wc-card-title">Matches ({matches.length})</div>
              {matches.length === 0 ? <div className="wc-empty">No matches yet.</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="wc-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Match</th>
                        <th>Stage</th>
                        <th>Date</th>
                        <th>Venue</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map(m => (
                        <tr key={m.id}>
                          <td style={{ color: 'var(--wc-text-muted)' }}>{m.match_number || m.id}</td>
                          <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {m.home_team.flag} {m.home_team.name} vs {m.away_team.flag} {m.away_team.name}
                          </td>
                          <td><span className="wc-badge wc-badge-gold">{m.stage_display}</span></td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                            {new Date(m.match_time).toLocaleString()}
                          </td>
                          <td style={{ fontSize: 12 }}>{m.venue || '—'}</td>
                          <td>
                            {m.is_completed
                              ? <span className="wc-badge wc-badge-green">{m.home_score}–{m.away_score}</span>
                              : m.is_locked
                              ? <span className="wc-badge wc-badge-muted">Locked</span>
                              : <span className="wc-badge wc-badge-muted">Upcoming</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="wc-btn wc-btn-sm wc-btn-secondary" onClick={() => handleMatchEdit(m)}>Edit</button>
                              <button className="wc-btn wc-btn-sm wc-btn-danger" onClick={() => handleMatchDelete(m.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {tab === 'results' && (
          <div className="wc-card">
            <div className="wc-card-title">Set Match Results</div>
            <p style={{ fontSize: 13, color: 'var(--wc-text-muted)', marginBottom: 16 }}>
              Setting a result automatically calculates points for all predictions on that match.
            </p>
            {matches.filter(m => !m.is_completed).length === 0 ? (
              <div className="wc-empty">All matches have results set.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="wc-table">
                  <thead>
                    <tr><th>Match</th><th>Date</th><th>Stage</th><th>Result</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {matches.filter(m => !m.is_completed).map(m => {
                      const inp = resultInputs.get(m.id) || { home: '', away: '', penalty_winner_id: '' };
                      const isSaving = resultSaving.has(m.id);
                      const isKO = KNOCKOUT_STAGES.has(m.stage);
                      const isDraw = inp.home !== '' && inp.away !== '' && parseInt(inp.home) === parseInt(inp.away);
                      return (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {m.home_team.flag} {m.home_team.name} vs {m.away_team.flag} {m.away_team.name}
                          </td>
                          <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            {new Date(m.match_time).toLocaleDateString()}
                          </td>
                          <td><span className="wc-badge wc-badge-gold">{m.stage_display}</span></td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div className="wc-result-inputs">
                                <input
                                  className="wc-result-input"
                                  type="number" min={0} max={20}
                                  placeholder="0"
                                  value={inp.home}
                                  onChange={e => setResultInputs(prev => {
                                    const n = new Map(prev);
                                    n.set(m.id, { ...inp, home: e.target.value });
                                    return n;
                                  })}
                                />
                                <span style={{ color: 'var(--wc-text-muted)', fontWeight: 700 }}>–</span>
                                <input
                                  className="wc-result-input"
                                  type="number" min={0} max={20}
                                  placeholder="0"
                                  value={inp.away}
                                  onChange={e => setResultInputs(prev => {
                                    const n = new Map(prev);
                                    n.set(m.id, { ...inp, away: e.target.value });
                                    return n;
                                  })}
                                />
                              </div>
                              {isKO && isDraw && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 11, color: 'var(--wc-text-muted)', whiteSpace: 'nowrap' }}>🥅 Pens:</span>
                                  <select
                                    className="wc-select"
                                    style={{ fontSize: 12, padding: '4px 8px' }}
                                    value={inp.penalty_winner_id}
                                    onChange={e => setResultInputs(prev => {
                                      const n = new Map(prev);
                                      n.set(m.id, { ...inp, penalty_winner_id: e.target.value });
                                      return n;
                                    })}
                                  >
                                    <option value="">— Penalty winner —</option>
                                    <option value={m.home_team.id}>{m.home_team.flag} {m.home_team.name}</option>
                                    <option value={m.away_team.id}>{m.away_team.flag} {m.away_team.name}</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <button
                              className="wc-btn wc-btn-sm wc-btn-success"
                              disabled={isSaving}
                              onClick={() => handleResultSave(m.id)}
                            >
                              {isSaving ? '…' : '✓ Set Result'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Completed matches summary */}
            {matches.filter(m => m.is_completed).length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--wc-text-muted)', marginBottom: 10 }}>
                  Completed Matches
                </div>
                {matches.filter(m => m.is_completed).map(m => (
                  <div key={m.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--wc-border)', fontSize: 13 }}>
                    <span style={{ flex: 1 }}>
                      {m.home_team.flag} {m.home_team.name} <strong>{m.home_score}–{m.away_score}</strong> {m.away_team.name} {m.away_team.flag}
                      {m.penalty_winner && <span style={{ color: 'var(--wc-text-muted)', marginLeft: 6 }}>(Pens: {m.penalty_winner.flag} {m.penalty_winner.name})</span>}
                    </span>
                    <span className="wc-badge wc-badge-green">Done</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Team Rankings Result ── */}
        {tab === 'rankings' && (
          <div className="wc-card">
            <div className="wc-card-title">🏅 Set Team Ranking Result</div>
            <p style={{ fontSize: 13, color: 'var(--wc-text-muted)', marginBottom: 20 }}>
              Set the actual top 3 teams and final match score. Mark as "Final" to award ranking points.
            </p>
            <div className="wc-form-row" style={{ marginBottom: 16 }}>
              {(['rank_1_id', 'rank_2_id', 'rank_3_id'] as const).map((key, i) => (
                <div key={key} className="wc-form-group">
                  <label className="wc-label">{['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'][i]}</label>
                  <select className="wc-select" style={{ width: '100%' }} value={rankForm[key]} onChange={e => setRankForm(p => ({ ...p, [key]: e.target.value }))}>
                    <option value="">— Select team —</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--wc-text-muted)', marginBottom: 10 }}>
              Final Match Score <span style={{ fontWeight: 400 }}>(1st place goals – 2nd place goals)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--wc-text-muted)', marginBottom: 4 }}>
                  {rankForm.rank_1_id ? teams.find(t => String(t.id) === rankForm.rank_1_id)?.name : '1st Place'}
                </div>
                <input className="wc-result-input" type="number" min={0} max={20} placeholder="0"
                  value={rankForm.final_score_1}
                  onChange={e => setRankForm(p => ({ ...p, final_score_1: e.target.value }))} />
              </div>
              <span style={{ color: 'var(--wc-text-muted)', fontWeight: 700, fontSize: 18 }}>–</span>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--wc-text-muted)', marginBottom: 4 }}>
                  {rankForm.rank_2_id ? teams.find(t => String(t.id) === rankForm.rank_2_id)?.name : '2nd Place'}
                </div>
                <input className="wc-result-input" type="number" min={0} max={20} placeholder="0"
                  value={rankForm.final_score_2}
                  onChange={e => setRankForm(p => ({ ...p, final_score_2: e.target.value }))} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--wc-text)', fontSize: 14, marginBottom: 20 }}>
              <input type="checkbox" checked={rankForm.is_final} onChange={e => setRankForm(p => ({ ...p, is_final: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: 'var(--wc-gold)', cursor: 'pointer' }} />
              Mark as final — award ranking prediction points to all players
            </label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="wc-btn wc-btn-primary" disabled={rankSaving} onClick={handleRankSave}>
                {rankSaving ? '…Saving' : 'Save Ranking Result'}
              </button>
              {rankSaved && <span className="wc-alert wc-alert-success" style={{ padding: '6px 12px', marginBottom: 0 }}>✓ Saved & points calculated</span>}
            </div>
            {rankResult && (
              <div style={{ marginTop: 20, padding: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 13, color: 'var(--wc-text-muted)' }}>
                <strong style={{ color: 'var(--wc-text)' }}>Current:</strong>{' '}
                {[rankResult.rank_1, rankResult.rank_2, rankResult.rank_3].map((t, i) =>
                  t ? `${['🥇','🥈','🥉'][i]} ${t.flag} ${t.name}` : null
                ).filter(Boolean).join(' · ')}
                {rankResult.final_score_1 !== null && rankResult.final_score_2 !== null &&
                  ` · Final: ${rankResult.final_score_1}–${rankResult.final_score_2}`}
                {' · '}{rankResult.is_final ? '✅ Final (points awarded)' : '⏳ Not final yet'}
              </div>
            )}
          </div>
        )}

        {/* ── Tournament Result ── */}
        {tab === 'tournament' && (
          <div className="wc-card">
            <div className="wc-card-title">🏆 Set Tournament Result</div>
            <p style={{ fontSize: 13, color: 'var(--wc-text-muted)', marginBottom: 20 }}>
              Set the winner and runner-up. Marking as "Final" will award tournament prediction points to all players.
            </p>
            <div className="wc-form-row" style={{ marginBottom: 20 }}>
              <div className="wc-form-group">
                <label className="wc-label">🥇 Tournament Winner</label>
                <select className="wc-select" style={{ width: '100%' }} value={tournWinnerId} onChange={e => setTournWinnerId(e.target.value)}>
                  <option value="">— Select winner —</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
                </select>
              </div>
              <div className="wc-form-group">
                <label className="wc-label">🥈 Runner-up</label>
                <select className="wc-select" style={{ width: '100%' }} value={tournRunnerUpId} onChange={e => setTournRunnerUpId(e.target.value)}>
                  <option value="">— Select runner-up —</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--wc-text)', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={tournIsFinal}
                  onChange={e => setTournIsFinal(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--wc-gold)', cursor: 'pointer' }}
                />
                Mark as final — award tournament prediction points
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="wc-btn wc-btn-primary" disabled={tournSaving} onClick={handleTournSave}>
                {tournSaving ? '…Saving' : 'Save Tournament Result'}
              </button>
              {tournSaved && (
                <span className="wc-alert wc-alert-success" style={{ padding: '6px 12px', marginBottom: 0 }}>✓ Saved</span>
              )}
            </div>

            {tournResult && (
              <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 13, color: 'var(--wc-text-muted)' }}>
                <strong style={{ color: 'var(--wc-text)' }}>Current setting:</strong>{' '}
                Winner: {tournResult.winner ? `${tournResult.winner.flag} ${tournResult.winner.name}` : 'Not set'} ·{' '}
                Runner-up: {tournResult.runner_up ? `${tournResult.runner_up.flag} ${tournResult.runner_up.name}` : 'Not set'} ·{' '}
                Final: {tournResult.is_final ? '✅ Yes (points awarded)' : '❌ No'}
              </div>
            )}
          </div>
        )}

        {/* ── Points Config ── */}
        {tab === 'config' && (
          <div className="wc-card">
            <div className="wc-card-title">⭐ Points Configuration</div>
            <p style={{ fontSize: 13, color: 'var(--wc-text-muted)', marginBottom: 20 }}>
              Configure how many points each correct prediction earns. Saving recalculates all existing points.
            </p>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--wc-text-muted)', marginBottom: 12 }}>Match Predictions</div>
            <div className="wc-config-grid" style={{ marginBottom: 24 }}>
              {[
                { key: 'exact_score', label: 'Exact Score', icon: '🎯', hint: 'e.g. correctly predicted 2–1' },
                { key: 'correct_winner', label: 'Correct Winner', icon: '✅', hint: 'right team wins (or draw)' },
                { key: 'correct_goal_difference', label: 'Goal Difference', icon: '↔', hint: 'right margin, wrong exact' },
              ].map(({ key, label, icon, hint }) => (
                <div key={key} className="wc-config-item">
                  <div className="wc-config-item-label"><span>{icon}</span>{label}</div>
                  <input className="wc-input" type="number" min={0} max={100}
                    value={(configForm as any)[key] ?? ''}
                    onChange={e => setConfigForm(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))} />
                  <div className="wc-config-item-hint">{hint}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--wc-text-muted)', marginBottom: 12, marginTop: 8 }}>Knockout Match Predictions (R16 / QF / SF / Final)</div>
            <div className="wc-config-grid" style={{ marginBottom: 24 }}>
              {[
                { key: 'ko_exact_score', label: 'Exact Score', icon: '🎯', hint: 'exact 90-min score in knockout' },
                { key: 'ko_correct_winner', label: 'Correct Outcome', icon: '✅', hint: 'right team wins or predicts draw (goes to pens)' },
                { key: 'ko_correct_goal_difference', label: 'Goal Difference', icon: '↔', hint: 'right margin in 90 min' },
                { key: 'ko_correct_penalty_winner', label: 'Penalty Winner', icon: '🥅', hint: 'bonus: correct penalty winner (draw predictions)' },
              ].map(({ key, label, icon, hint }) => (
                <div key={key} className="wc-config-item">
                  <div className="wc-config-item-label"><span>{icon}</span>{label}</div>
                  <input className="wc-input" type="number" min={0} max={100}
                    value={(configForm as any)[key] ?? ''}
                    onChange={e => setConfigForm(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))} />
                  <div className="wc-config-item-hint">{hint}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--wc-text-muted)', marginBottom: 12 }}>Tournament Prediction</div>
            <div className="wc-config-grid" style={{ marginBottom: 24 }}>
              {[
                { key: 'tournament_winner', label: 'Tournament Winner', icon: '🏆', hint: 'picks the champion' },
                { key: 'tournament_runner_up', label: 'Runner-up', icon: '🥈', hint: 'picks the finalist' },
              ].map(({ key, label, icon, hint }) => (
                <div key={key} className="wc-config-item">
                  <div className="wc-config-item-label"><span>{icon}</span>{label}</div>
                  <input className="wc-input" type="number" min={0} max={100}
                    value={(configForm as any)[key] ?? ''}
                    onChange={e => setConfigForm(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))} />
                  <div className="wc-config-item-hint">{hint}</div>
                </div>
              ))}
              <div className="wc-config-item" style={{ gridColumn: '1 / -1' }}>
                <div className="wc-config-item-label">🔒 Lock Tournament Predictions</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--wc-text)', fontSize: 14 }}>
                  <input type="checkbox" checked={!!configForm.tournament_predictions_locked}
                    onChange={e => setConfigForm(p => ({ ...p, tournament_predictions_locked: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: 'var(--wc-gold)', cursor: 'pointer' }} />
                  Prevent users from changing their tournament winner / runner-up prediction
                </label>
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--wc-text-muted)', marginBottom: 12 }}>Team Rankings (Max +35)</div>
            <div className="wc-config-grid" style={{ marginBottom: 12 }}>
              {[
                { key: 'ranking_top3_each', label: 'Top 3 (each)', icon: '🏅', hint: '+pts per correct team in top 3 (any order)' },
                { key: 'ranking_correct_first', label: 'Correct 1st', icon: '🥇', hint: 'bonus for exact 1st place' },
                { key: 'ranking_correct_second', label: 'Correct 2nd', icon: '🥈', hint: 'bonus for exact 2nd place' },
                { key: 'ranking_final_exact', label: 'Final: Exact Score', icon: '🎯', hint: 'requires correct finalists' },
                { key: 'ranking_final_one_score', label: 'Final: One Team', icon: '🔢', hint: 'one team score correct in final' },
                { key: 'ranking_final_diff_winner', label: 'Final: Diff+Winner', icon: '↔', hint: 'correct goal diff & winner in final' },
              ].map(({ key, label, icon, hint }) => (
                <div key={key} className="wc-config-item">
                  <div className="wc-config-item-label"><span>{icon}</span>{label}</div>
                  <input className="wc-input" type="number" min={0} max={100}
                    value={(configForm as any)[key] ?? ''}
                    onChange={e => setConfigForm(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))} />
                  <div className="wc-config-item-hint">{hint}</div>
                </div>
              ))}
              <div className="wc-config-item" style={{ gridColumn: '1 / -1' }}>
                <div className="wc-config-item-label">🔒 Lock Rankings Predictions</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--wc-text)', fontSize: 14 }}>
                  <input type="checkbox" checked={!!configForm.ranking_predictions_locked}
                    onChange={e => setConfigForm(p => ({ ...p, ranking_predictions_locked: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: 'var(--wc-gold)', cursor: 'pointer' }} />
                  Prevent users from changing their team ranking prediction
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20 }}>
              <button className="wc-btn wc-btn-primary" disabled={configSaving} onClick={handleConfigSave}>
                {configSaving ? '…Saving' : 'Save Configuration'}
              </button>
              {configSaved && (
                <span className="wc-alert wc-alert-success" style={{ padding: '6px 12px', marginBottom: 0 }}>✓ Saved & recalculated</span>
              )}
            </div>
          </div>
        )}
      </div>
    </WCLayout>
  );
};

export default WCAdmin;
