import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import wcService, { type Match, type Prediction } from '../../services/wcService';
import WCLayout from './WCLayout';
import { useAuth } from '../../context/AuthContext';

const STAGE_ORDER = ['group', 'r16', 'qf', 'sf', '3rd', 'final'];

function formatMatchTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Client-side lock check — match is locked once its start time is reached. */
function isMatchLocked(match: Match, now: number): boolean {
  return match.is_locked || now >= new Date(match.match_time).getTime();
}

const WCMatches: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [myPredictions, setMyPredictions] = useState<Map<number, Prediction>>(new Map());
  const [pendingInputs, setPendingInputs] = useState<Map<number, { home: string; away: string }>>(new Map());
  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [savedFlash, setSavedFlash] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState('all');
  // Ticks every 30 s so the lock state stays current without a full reload
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const ms = await wcService.getMatches();
        setMatches(ms);
        if (isAuthenticated) {
          const preds = await wcService.getMyPredictions();
          const map = new Map(preds.map(p => [p.match.id, p]));
          setMyPredictions(map);
          const inputs = new Map<number, { home: string; away: string }>();
          preds.forEach(p => inputs.set(p.match.id, {
            home: String(p.home_score),
            away: String(p.away_score),
          }));
          setPendingInputs(inputs);
        }
      } catch {
        setError('Failed to load matches.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  const grouped = useMemo(() => {
    const filtered = filterStage === 'all' ? matches : matches.filter(m => m.stage === filterStage);
    const groups: Record<string, Match[]> = {};
    for (const m of filtered) {
      if (!groups[m.stage]) groups[m.stage] = [];
      groups[m.stage].push(m);
    }
    return STAGE_ORDER.filter(s => groups[s]).map(s => ({ stage: s, matches: groups[s] }));
  }, [matches, filterStage]);

  const handleInput = (matchId: number, side: 'home' | 'away', val: string) => {
    setPendingInputs(prev => {
      const next = new Map(prev);
      const cur = next.get(matchId) || { home: '0', away: '0' };
      next.set(matchId, { ...cur, [side]: val });
      return next;
    });
  };

  const handleSave = async (matchId: number) => {
    const inp = pendingInputs.get(matchId);
    if (!inp) return;
    const home = parseInt(inp.home);
    const away = parseInt(inp.away);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setError('Please enter valid non-negative scores.');
      return;
    }
    setError(null);
    setSaving(prev => new Set(prev).add(matchId));
    try {
      const pred = await wcService.savePrediction(matchId, home, away);
      setMyPredictions(prev => new Map(prev).set(matchId, pred));
      setSavedFlash(prev => {
        const next = new Set(prev);
        next.add(matchId);
        setTimeout(() => setSavedFlash(p => { const n = new Set(p); n.delete(matchId); return n; }), 2500);
        return next;
      });
    } catch (e: any) {
      setError(e.response?.data?.non_field_errors?.[0] || e.response?.data?.detail || 'Failed to save prediction.');
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(matchId); return n; });
    }
  };

  const stageLabel = (s: string) =>
    ({ group: 'Group Stage', r16: 'Round of 16', qf: 'Quarter Finals', sf: 'Semi Finals', '3rd': '3rd Place Play-off', final: '🏆 Final' }[s] || s);

  const stages = [...new Set(matches.map(m => m.stage))];

  return (
    <WCLayout>
      <div className="wc-page">
        <div className="wc-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="wc-page-title">⚽ Match Predictions</h1>
            <p className="wc-page-subtitle">Predict the score for each match before it starts</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="wc-select"
              value={filterStage}
              onChange={e => setFilterStage(e.target.value)}
            >
              <option value="all">All Stages</option>
              {stages.map(s => (
                <option key={s} value={s}>{stageLabel(s)}</option>
              ))}
            </select>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="wc-alert wc-alert-info">
            <span>🔒</span>
            <span><Link to="/login" style={{ color: 'inherit', fontWeight: 700 }}>Sign in</Link> to save your predictions.</span>
          </div>
        )}

        {error && (
          <div className="wc-alert wc-alert-error">
            <span>⚠</span><span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="wc-loading"><div className="wc-spinner" /></div>
        ) : matches.length === 0 ? (
          <div className="wc-empty">No matches scheduled yet. Check back soon!</div>
        ) : (
          grouped.map(({ stage, matches: stageMatches }) => (
            <div key={stage}>
              <div className="wc-stage-header">
                <span className="wc-stage-label">{stageLabel(stage)}</span>
                <div className="wc-stage-line" />
                <span style={{ fontSize: 12, color: 'var(--wc-text-muted)', whiteSpace: 'nowrap' }}>
                  {stageMatches.filter(m => myPredictions.has(m.id)).length}/{stageMatches.length} predicted
                </span>
              </div>
              <div className="wc-matches-grid">
                {stageMatches.map(match => {
                  const pred = myPredictions.get(match.id);
                  const inp = pendingInputs.get(match.id) || { home: '', away: '' };
                  const isSaving = saving.has(match.id);
                  const justSaved = savedFlash.has(match.id);
                  const locked = isMatchLocked(match, now);

                  return (
                    <div
                      key={match.id}
                      className={`wc-match-card ${pred ? 'has-prediction' : ''} ${match.is_completed ? 'is-completed' : ''}`}
                    >
                      <div className="wc-match-header">
                        <span>{formatMatchTime(match.match_time)}</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {match.venue && <span>{match.venue}</span>}
                          {match.match_number && <span>Match {match.match_number}</span>}
                          {locked && !match.is_completed && (
                            <span className="wc-locked-badge">🔒 Locked</span>
                          )}
                          {match.is_completed && (
                            <span className="wc-badge wc-badge-muted">Full Time</span>
                          )}
                        </div>
                      </div>

                      <div className="wc-match-body">
                        <div className="wc-team">
                          <span className="wc-team-flag">{match.home_team.flag || '🏳'}</span>
                          <div>
                            <div className="wc-team-name">{match.home_team.name}</div>
                            {match.home_team.group && <div className="wc-team-group">Group {match.home_team.group}</div>}
                          </div>
                        </div>

                        <div className="wc-match-vs">
                          {match.is_completed ? (
                            <div className="wc-score-display">
                              {match.home_score}
                              <span className="wc-score-separator"> – </span>
                              {match.away_score}
                            </div>
                          ) : (
                            <div className="wc-vs-label">VS</div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--wc-text-muted)' }}>
                            {match.stage_display}
                          </div>
                        </div>

                        <div className="wc-team away">
                          <span className="wc-team-flag">{match.away_team.flag || '🏳'}</span>
                          <div style={{ textAlign: 'right' }}>
                            <div className="wc-team-name">{match.away_team.name}</div>
                            {match.away_team.group && <div className="wc-team-group">Group {match.away_team.group}</div>}
                          </div>
                        </div>
                      </div>

                      {/* Prediction row */}
                      <div className="wc-prediction-row">
                        <span className="wc-prediction-label">Your Prediction:</span>

                        {locked ? (
                          pred ? (
                            <>
                              <div className="wc-pred-inputs">
                                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--wc-text)' }}>
                                  {pred.home_score} – {pred.away_score}
                                </span>
                              </div>
                              {pred.points_earned !== null && (
                                <span className="wc-pred-points-chip">+{pred.points_earned} pts</span>
                              )}
                              {match.is_completed && pred.points_earned === null && (
                                <span className="wc-pred-locked-msg">Calculating…</span>
                              )}
                            </>
                          ) : (
                            <span className="wc-pred-locked-msg">
                              {match.is_completed ? 'No prediction made' : '🔒 Match started — predictions closed'}
                            </span>
                          )
                        ) : isAuthenticated ? (
                          <>
                            <div className="wc-pred-inputs">
                              <input
                                className="wc-score-input"
                                type="number"
                                min={0}
                                max={20}
                                value={inp.home}
                                onChange={e => handleInput(match.id, 'home', e.target.value)}
                                placeholder="0"
                              />
                              <span className="wc-score-dash">–</span>
                              <input
                                className="wc-score-input"
                                type="number"
                                min={0}
                                max={20}
                                value={inp.away}
                                onChange={e => handleInput(match.id, 'away', e.target.value)}
                                placeholder="0"
                              />
                            </div>
                            <button
                              className="wc-pred-save-btn"
                              disabled={isSaving}
                              onClick={() => handleSave(match.id)}
                            >
                              {isSaving ? '…' : pred ? 'Update' : 'Save'}
                            </button>
                            {justSaved && <span className="wc-pred-saved-chip">✓ Saved</span>}
                            {pred && !justSaved && (
                              <span className="wc-pred-saved-chip" style={{ opacity: 0.6 }}>✓ {pred.home_score}–{pred.away_score}</span>
                            )}
                          </>
                        ) : (
                          <span className="wc-pred-locked-msg">
                            <Link to="/login" style={{ color: 'var(--wc-gold)' }}>Sign in</Link> to predict
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </WCLayout>
  );
};

export default WCMatches;
