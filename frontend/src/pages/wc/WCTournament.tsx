import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import wcService, { type Team, type TournamentPrediction, type TournamentResult, type PointsConfig } from '../../services/wcService';
import WCLayout from './WCLayout';
import { useAuth } from '../../context/AuthContext';

const WCTournament: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [myPrediction, setMyPrediction] = useState<TournamentPrediction | null>(null);
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [config, setConfig] = useState<PointsConfig | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<number | null>(null);
  const [selectedRunnerUp, setSelectedRunnerUp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const [ts, cfg, res] = await Promise.all([
          wcService.getTeams(),
          wcService.getPointsConfig(),
          wcService.getTournamentResult(),
        ]);
        setTeams(ts);
        setConfig(cfg);
        setResult(res);
        if (isAuthenticated) {
          const pred = await wcService.getTournamentPrediction();
          if (pred) {
            setMyPrediction(pred);
            setSelectedWinner(pred.predicted_winner?.id ?? null);
            setSelectedRunnerUp(pred.predicted_runner_up?.id ?? null);
          }
        }
      } catch {
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  const isLocked = config?.tournament_predictions_locked || false;

  const handleSave = async () => {
    if (!selectedWinner || !selectedRunnerUp) {
      setError('Please select both the tournament winner and runner-up.');
      return;
    }
    if (selectedWinner === selectedRunnerUp) {
      setError('Winner and runner-up cannot be the same team.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const pred = await wcService.saveTournamentPrediction(selectedWinner, selectedRunnerUp);
      setMyPrediction(pred);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.response?.data?.non_field_errors?.[0] || e.response?.data?.detail || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const groups = [...new Set(teams.map(t => t.group).filter(Boolean))].sort();
  const filteredTeams = groupFilter === 'all' ? teams : teams.filter(t => t.group === groupFilter);

  const winnerTeam = teams.find(t => t.id === selectedWinner);
  const runnerUpTeam = teams.find(t => t.id === selectedRunnerUp);

  return (
    <WCLayout>
      <div className="wc-page">
        <div className="wc-page-header">
          <h1 className="wc-page-title">🌍 Tournament Predictions</h1>
          <p className="wc-page-subtitle">
            Pick the tournament winner and runner-up before predictions are locked
          </p>
        </div>

        {/* Official result */}
        {result?.is_final && (
          <div className="wc-card" style={{ marginBottom: 24, borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.06)' }}>
            <div className="wc-card-title">🏆 Official Tournament Result</div>
            <div className="wc-tourn-selection">
              <div className="wc-tourn-slot">
                <div className="wc-tourn-slot-label">🥇 Champion</div>
                {result.winner ? (
                  <div className="wc-tourn-slot-value">
                    <span className="flag">{result.winner.flag}</span>
                    <span>{result.winner.name}</span>
                  </div>
                ) : <div className="wc-tourn-slot-empty">TBD</div>}
              </div>
              <div className="wc-tourn-slot">
                <div className="wc-tourn-slot-label">🥈 Runner-up</div>
                {result.runner_up ? (
                  <div className="wc-tourn-slot-value">
                    <span className="flag">{result.runner_up.flag}</span>
                    <span>{result.runner_up.name}</span>
                  </div>
                ) : <div className="wc-tourn-slot-empty">TBD</div>}
              </div>
            </div>
            {myPrediction?.points_earned !== null && myPrediction?.points_earned !== undefined && (
              <div className="wc-alert wc-alert-success" style={{ marginTop: 12 }}>
                <span>🎉</span>
                <span>You earned <strong>{myPrediction.points_earned} points</strong> from your tournament prediction!</span>
              </div>
            )}
          </div>
        )}

        {/* Points info */}
        {config && (
          <div className="wc-points-breakdown">
            <div className="wc-pb-title">🏆 Tournament Points</div>
            <div className="wc-pb-row">
              <span>🥇 Tournament winner correctly predicted</span>
              <span className="wc-pb-pts">+{config.tournament_winner} pts</span>
            </div>
            <div className="wc-pb-row">
              <span>🥈 Runner-up correctly predicted</span>
              <span className="wc-pb-pts">+{config.tournament_runner_up} pts</span>
            </div>
          </div>
        )}

        {/* Locked notice */}
        {isLocked && (
          <div className="wc-alert wc-alert-error">
            <span>🔒</span>
            <span>Tournament predictions are now locked. No further changes are allowed.</span>
          </div>
        )}

        {!isAuthenticated ? (
          <div className="wc-alert wc-alert-info">
            <span>🔒</span>
            <span><Link to="/login" style={{ color: 'inherit', fontWeight: 700 }}>Sign in</Link> to make your tournament prediction.</span>
          </div>
        ) : (
          <>
            {/* Current selection preview */}
            <div className="wc-tourn-selection" style={{ marginBottom: 24 }}>
              <div className="wc-tourn-slot">
                <div className="wc-tourn-slot-label">🥇 Your Winner Pick</div>
                {winnerTeam ? (
                  <div className="wc-tourn-slot-value">
                    <span className="flag">{winnerTeam.flag}</span>
                    <span>{winnerTeam.name}</span>
                  </div>
                ) : <div className="wc-tourn-slot-empty">Not selected yet</div>}
              </div>
              <div className="wc-tourn-slot">
                <div className="wc-tourn-slot-label">🥈 Your Runner-up Pick</div>
                {runnerUpTeam ? (
                  <div className="wc-tourn-slot-value">
                    <span className="flag">{runnerUpTeam.flag}</span>
                    <span>{runnerUpTeam.name}</span>
                  </div>
                ) : <div className="wc-tourn-slot-empty">Not selected yet</div>}
              </div>
            </div>

            {!isLocked && (
              <>
                {error && (
                  <div className="wc-alert wc-alert-error"><span>⚠</span><span>{error}</span></div>
                )}

                {/* Group filter */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--wc-text-muted)', fontWeight: 600 }}>Filter:</span>
                  <button
                    className={`wc-btn wc-btn-sm ${groupFilter === 'all' ? 'wc-btn-primary' : 'wc-btn-secondary'}`}
                    onClick={() => setGroupFilter('all')}
                  >
                    All
                  </button>
                  {groups.map(g => (
                    <button
                      key={g}
                      className={`wc-btn wc-btn-sm ${groupFilter === g ? 'wc-btn-primary' : 'wc-btn-secondary'}`}
                      onClick={() => setGroupFilter(g)}
                    >
                      Group {g}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="wc-loading"><div className="wc-spinner" /></div>
                ) : teams.length === 0 ? (
                  <div className="wc-empty">No teams added yet. Admin needs to add teams first.</div>
                ) : (
                  <>
                    {/* Pick winner */}
                    <div className="wc-card" style={{ marginBottom: 16 }}>
                      <div className="wc-card-title">🥇 Select Tournament Winner</div>
                      <div className="wc-team-grid">
                        {filteredTeams.map(team => (
                          <button
                            key={team.id}
                            className={`wc-team-option ${selectedWinner === team.id ? 'selected' : ''}`}
                            onClick={() => setSelectedWinner(team.id === selectedWinner ? null : team.id)}
                            disabled={team.id === selectedRunnerUp}
                            title={team.id === selectedRunnerUp ? 'Already selected as runner-up' : ''}
                          >
                            <span className="flag">{team.flag || '🏳'}</span>
                            <span className="tname">{team.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pick runner-up */}
                    <div className="wc-card" style={{ marginBottom: 20 }}>
                      <div className="wc-card-title">🥈 Select Runner-up</div>
                      <div className="wc-team-grid">
                        {filteredTeams.map(team => (
                          <button
                            key={team.id}
                            className={`wc-team-option ${selectedRunnerUp === team.id ? 'selected' : ''}`}
                            onClick={() => setSelectedRunnerUp(team.id === selectedRunnerUp ? null : team.id)}
                            disabled={team.id === selectedWinner}
                            title={team.id === selectedWinner ? 'Already selected as winner' : ''}
                          >
                            <span className="flag">{team.flag || '🏳'}</span>
                            <span className="tname">{team.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <button
                        className="wc-btn wc-btn-primary"
                        onClick={handleSave}
                        disabled={saving || !selectedWinner || !selectedRunnerUp}
                      >
                        {saving ? '…Saving' : myPrediction ? 'Update Prediction' : 'Save Prediction'}
                      </button>
                      {saved && (
                        <span className="wc-alert wc-alert-success" style={{ padding: '6px 12px', marginBottom: 0 }}>
                          ✓ Saved!
                        </span>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </WCLayout>
  );
};

export default WCTournament;
