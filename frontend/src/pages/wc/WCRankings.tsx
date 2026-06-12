import React, { useEffect, useState } from 'react';
import wcService, {
  type Team,
  type TeamRankingPrediction,
  type TeamRankingResult,
  type PointsConfig,
} from '../../services/wcService';
import WCLayout from './WCLayout';

// ── Team picker card ─────────────────────────────────────────────────────────
const TeamPicker: React.FC<{
  label: string;
  sublabel: string;
  value: Team | null;
  teams: Team[];
  disabledIds: Set<number>;
  onChange: (team: Team | null) => void;
  locked: boolean;
}> = ({ label, sublabel, value, teams, disabledIds, onChange, locked }) => (
  <div className="wc-rank-slot">
    <div className="wc-rank-slot-label">{label}</div>
    <div className="wc-rank-slot-sub">{sublabel}</div>
    {locked && value ? (
      <div className="wc-rank-slot-selected">
        <span style={{ fontSize: 28 }}>{value.flag || '🏳'}</span>
        <span>{value.name}</span>
      </div>
    ) : (
      <select
        className="wc-select"
        value={value?.id ?? ''}
        disabled={locked}
        onChange={e => {
          const id = parseInt(e.target.value);
          onChange(isNaN(id) ? null : teams.find(t => t.id === id) || null);
        }}
      >
        <option value="">— Pick a team —</option>
        {teams.map(t => (
          <option key={t.id} value={t.id} disabled={disabledIds.has(t.id)}>
            {t.flag} {t.name}
          </option>
        ))}
      </select>
    )}
  </div>
);

// ── Main page ────────────────────────────────────────────────────────────────
const WCRankings: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [config, setConfig] = useState<PointsConfig | null>(null);
  const [existing, setExisting] = useState<TeamRankingPrediction | null>(null);
  const [result, setResult] = useState<TeamRankingResult | null>(null);
  const [loading, setLoading] = useState(true);

  const [rank1, setRank1] = useState<Team | null>(null);
  const [rank2, setRank2] = useState<Team | null>(null);
  const [rank3, setRank3] = useState<Team | null>(null);
  const [finalScore1, setFinalScore1] = useState('');
  const [finalScore2, setFinalScore2] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = config?.ranking_predictions_locked ?? false;
  const finalistsReady = rank1 !== null && rank2 !== null;

  useEffect(() => {
    const load = async () => {
      try {
        const [ts, cfg, pred, res] = await Promise.all([
          wcService.getTeams(),
          wcService.getPointsConfig(),
          wcService.getRankingPrediction(),
          wcService.getRankingResult(),
        ]);
        setTeams(ts);
        setConfig(cfg);
        setResult(res);
        if (pred) {
          setExisting(pred);
          setRank1(pred.rank_1);
          setRank2(pred.rank_2);
          setRank3(pred.rank_3);
          setFinalScore1(pred.final_score_1 !== null ? String(pred.final_score_1) : '');
          setFinalScore2(pred.final_score_2 !== null ? String(pred.final_score_2) : '');
        }
      } catch {
        setError('Failed to load ranking data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const fs1 = finalScore1 !== '' ? parseInt(finalScore1) : null;
      const fs2 = finalScore2 !== '' ? parseInt(finalScore2) : null;
      if ((fs1 !== null && isNaN(fs1)) || (fs2 !== null && isNaN(fs2))) {
        setError('Final match scores must be numbers.');
        return;
      }
      const pred = await wcService.saveRankingPrediction({
        rank_1_id: rank1?.id ?? null,
        rank_2_id: rank2?.id ?? null,
        rank_3_id: rank3?.id ?? null,
        final_score_1: finalistsReady ? (fs1 ?? null) : null,
        final_score_2: finalistsReady ? (fs2 ?? null) : null,
      });
      setExisting(pred);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      const d = e.response?.data;
      setError(
        typeof d === 'string' ? d
          : d?.non_field_errors?.[0] ?? d?.error ?? 'Failed to save prediction.'
      );
    } finally {
      setSaving(false);
    }
  };

  const pointsSummary = config ? [
    { label: '⚽ Each team correct in top 3', pts: config.ranking_top3_each, max: config.ranking_top3_each * 3 },
    { label: '🥇 Correct 1st place (bonus)', pts: config.ranking_correct_first, max: config.ranking_correct_first },
    { label: '🥈 Correct 2nd place (bonus)', pts: config.ranking_correct_second, max: config.ranking_correct_second },
    { label: '🎯 Final: exact score', pts: config.ranking_final_exact, max: config.ranking_final_exact },
    { label: '🔢 Final: one team score correct', pts: config.ranking_final_one_score, max: config.ranking_final_one_score },
    { label: '↔ Final: diff + winner correct', pts: config.ranking_final_diff_winner, max: config.ranking_final_diff_winner },
  ] : [];

  return (
    <WCLayout>
      <div className="wc-page">
        <div className="wc-page-header">
          <h1 className="wc-page-title">🏅 Team Rankings</h1>
          <p className="wc-page-subtitle">Predict the top 3 teams and the final match score</p>
        </div>

        {error && (
          <div className="wc-alert wc-alert-error"><span>⚠</span><span>{error}</span></div>
        )}

        {locked && (
          <div className="wc-alert wc-alert-info" style={{ marginBottom: 20 }}>
            <span>🔒</span><span>Ranking predictions are locked — no more changes allowed.</span>
          </div>
        )}

        {loading ? (
          <div className="wc-loading"><div className="wc-spinner" /></div>
        ) : (
          <>
            {/* Result banner — shown when is_final */}
            {result?.is_final && (
              <div className="wc-card" style={{ marginBottom: 24, borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.06)' }}>
                <div className="wc-card-title" style={{ marginBottom: 16 }}>🏆 Official Results</div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {[
                    { label: '🥇 1st Place', team: result.rank_1 },
                    { label: '🥈 2nd Place', team: result.rank_2 },
                    { label: '🥉 3rd Place', team: result.rank_3 },
                  ].map(({ label, team }) => (
                    <div key={label} style={{ textAlign: 'center', minWidth: 80 }}>
                      <div style={{ fontSize: 11, color: 'var(--wc-text-muted)', fontWeight: 700, marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 28 }}>{team?.flag || '—'}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--wc-text)' }}>{team?.name || '—'}</div>
                    </div>
                  ))}
                  {result.final_score_1 !== null && result.final_score_2 !== null && (
                    <div style={{ borderLeft: '1px solid var(--wc-border)', paddingLeft: 20 }}>
                      <div style={{ fontSize: 11, color: 'var(--wc-text-muted)', fontWeight: 700, marginBottom: 6 }}>Final Score</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--wc-text)' }}>
                        {result.final_score_1} – {result.final_score_2}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--wc-text-muted)', marginTop: 4 }}>
                        {result.rank_1?.name} vs {result.rank_2?.name}
                      </div>
                    </div>
                  )}
                </div>
                {existing?.points_earned !== null && existing?.points_earned !== undefined && (
                  <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(245,158,11,0.12)', borderRadius: 8, display: 'inline-block' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--wc-gold)' }}>
                      Your ranking points: +{existing.points_earned} pts
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Top 3 picker */}
            <div className="wc-card" style={{ marginBottom: 20 }}>
              <div className="wc-card-title">🏆 Pick Your Top 3</div>
              <p style={{ fontSize: 13, color: 'var(--wc-text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                +{config?.ranking_top3_each ?? 5} pts each team in top 3 (any order) · +{config?.ranking_correct_first ?? 15} bonus for correct 1st · +{config?.ranking_correct_second ?? 5} bonus for correct 2nd
              </p>
              <div className="wc-rank-slots">
                <TeamPicker
                  label="🥇 1st Place"
                  sublabel={`+${config?.ranking_top3_each ?? 5} + ${config?.ranking_correct_first ?? 15} pts`}
                  value={rank1}
                  teams={teams}
                  disabledIds={new Set([rank2?.id, rank3?.id].filter(Boolean) as number[])}
                  onChange={setRank1}
                  locked={locked}
                />
                <TeamPicker
                  label="🥈 2nd Place"
                  sublabel={`+${config?.ranking_top3_each ?? 5} + ${config?.ranking_correct_second ?? 5} pts`}
                  value={rank2}
                  teams={teams}
                  disabledIds={new Set([rank1?.id, rank3?.id].filter(Boolean) as number[])}
                  onChange={setRank2}
                  locked={locked}
                />
                <TeamPicker
                  label="🥉 3rd Place"
                  sublabel={`+${config?.ranking_top3_each ?? 5} pts`}
                  value={rank3}
                  teams={teams}
                  disabledIds={new Set([rank1?.id, rank2?.id].filter(Boolean) as number[])}
                  onChange={setRank3}
                  locked={locked}
                />
              </div>
            </div>

            {/* Final match score — unlocks when both finalists are picked */}
            <div className="wc-card" style={{ marginBottom: 20, opacity: finalistsReady ? 1 : 0.5 }}>
              <div className="wc-card-title">
                ⚽ Final Match Score
                {!finalistsReady && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--wc-text-muted)', marginLeft: 10 }}>
                    (Pick both finalists above to unlock)
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: 'var(--wc-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                Only scored if your 1st + 2nd picks are both correct finalists ·
                +{config?.ranking_final_exact ?? 10} exact · +{config?.ranking_final_one_score ?? 5} one team · +{config?.ranking_final_diff_winner ?? 3} diff+winner
              </p>
              <div className="wc-final-score-row">
                <div className="wc-final-team">
                  <span style={{ fontSize: 24 }}>{rank1?.flag || '🥇'}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{rank1?.name || '1st Place'}</span>
                </div>
                <input
                  className="wc-score-input"
                  type="number"
                  min={0}
                  max={20}
                  value={finalScore1}
                  disabled={!finalistsReady || locked}
                  onChange={e => setFinalScore1(e.target.value)}
                  placeholder="0"
                />
                <span className="wc-score-dash" style={{ fontSize: 20 }}>–</span>
                <input
                  className="wc-score-input"
                  type="number"
                  min={0}
                  max={20}
                  value={finalScore2}
                  disabled={!finalistsReady || locked}
                  onChange={e => setFinalScore2(e.target.value)}
                  placeholder="0"
                />
                <div className="wc-final-team">
                  <span style={{ fontSize: 24 }}>{rank2?.flag || '🥈'}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{rank2?.name || '2nd Place'}</span>
                </div>
              </div>
            </div>

            {/* Save button */}
            {!locked && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <button
                  className="wc-btn wc-btn-primary"
                  disabled={saving || (!rank1 && !rank2 && !rank3)}
                  onClick={handleSave}
                  style={{ minWidth: 140, justifyContent: 'center' }}
                >
                  {saving ? 'Saving…' : existing ? '💾 Update Prediction' : '💾 Save Prediction'}
                </button>
                {saved && <span className="wc-pred-saved-chip">✓ Saved!</span>}
              </div>
            )}

            {/* Points breakdown */}
            {config && (
              <div className="wc-card">
                <div className="wc-card-title">⭐ Points Breakdown (Max +{
                  config.ranking_top3_each * 3 + config.ranking_correct_first + config.ranking_correct_second +
                  config.ranking_final_exact
                })</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                  {pointsSummary.map(({ label, pts, max }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--wc-border)' }}>
                      <span style={{ color: 'var(--wc-text-muted)' }}>{label}</span>
                      <span style={{ fontWeight: 700, color: 'var(--wc-gold)' }}>
                        +{pts} pts{max !== pts ? ` (max +${max})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </WCLayout>
  );
};

export default WCRankings;
