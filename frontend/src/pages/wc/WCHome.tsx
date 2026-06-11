import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import wcService, { type LeaderboardEntry, type MyStats, type PointsConfig, type TournamentResult } from '../../services/wcService';
import WCLayout from './WCLayout';
import { useAuth } from '../../context/AuthContext';

const WCHome: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [config, setConfig] = useState<PointsConfig | null>(null);
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [lb, cfg, res] = await Promise.all([
          wcService.getLeaderboard(),
          wcService.getPointsConfig(),
          wcService.getTournamentResult(),
        ]);
        setLeaderboard(lb);
        setConfig(cfg);
        setResult(res);
        if (isAuthenticated) {
          const stats = await wcService.getMyStats();
          setMyStats(stats);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  const myEntry = leaderboard.find(e => e.username === user?.username);

  return (
    <WCLayout>
      <div className="wc-page">
        {/* Hero */}
        <div className="wc-page-header">
          <h1 className="wc-page-title">🏆 World Cup Predictor</h1>
          <p className="wc-page-subtitle">
            Predict match scores, earn points, climb the leaderboard
          </p>
        </div>

        {/* Tournament result banner */}
        {result?.is_final && (
          <div className="wc-card" style={{ marginBottom: 24, borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 36 }}>🏆</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--wc-gold)', marginBottom: 4 }}>
                  Tournament Champion
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--wc-text)' }}>
                  {result.winner?.flag} {result.winner?.name}
                </div>
              </div>
              {result.runner_up && (
                <>
                  <div style={{ width: 1, height: 40, background: 'var(--wc-border)' }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--wc-text-muted)', marginBottom: 4 }}>
                      Runner-up
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--wc-text)' }}>
                      {result.runner_up.flag} {result.runner_up.name}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* My stats */}
        {isAuthenticated && myStats && (
          <div className="wc-stats-bar">
            <div className="wc-stat-card">
              <div className="wc-stat-label">My Points</div>
              <div className="wc-stat-value">{myStats.total_points}</div>
              <div className="wc-stat-sub">Rank #{myEntry?.rank ?? '—'}</div>
            </div>
            <div className="wc-stat-card">
              <div className="wc-stat-label">Exact Scores</div>
              <div className="wc-stat-value">{myStats.exact_scores}</div>
              <div className="wc-stat-sub">{myStats.exact_scores > 0 ? `+${(myStats.exact_scores * (config?.exact_score ?? 5))} pts` : 'none yet'}</div>
            </div>
            <div className="wc-stat-card">
              <div className="wc-stat-label">Predictions</div>
              <div className="wc-stat-value">{myStats.predictions_made}</div>
              <div className="wc-stat-sub">{myStats.matches_completed} completed</div>
            </div>
            <div className="wc-stat-card">
              <div className="wc-stat-label">Tourn. Points</div>
              <div className="wc-stat-value">{myStats.tournament_points}</div>
              <div className="wc-stat-sub">winner + runner-up</div>
            </div>
          </div>
        )}

        {/* Points system */}
        {config && (
          <div className="wc-points-breakdown" style={{ marginBottom: 28 }}>
            <div className="wc-pb-title">⭐ Points System</div>
            <div className="wc-pb-row">
              <span>🎯 Exact score (e.g. 2–1 predicted correctly)</span>
              <span className="wc-pb-pts">+{config.exact_score} pts</span>
            </div>
            <div className="wc-pb-row">
              <span>✅ Correct winner / draw</span>
              <span className="wc-pb-pts">+{config.correct_winner} pts</span>
            </div>
            <div className="wc-pb-row">
              <span>↔ Correct goal difference</span>
              <span className="wc-pb-pts">+{config.correct_goal_difference} pts</span>
            </div>
            <div className="wc-pb-row">
              <span>🏆 Tournament winner (predicted before tournament)</span>
              <span className="wc-pb-pts">+{config.tournament_winner} pts</span>
            </div>
            <div className="wc-pb-row">
              <span>🥈 Runner-up prediction</span>
              <span className="wc-pb-pts">+{config.tournament_runner_up} pts</span>
            </div>
          </div>
        )}

        {/* CTA for guests */}
        {!isAuthenticated && (
          <div className="wc-guest-banner">
            <div className="wc-guest-banner-left">
              <span className="wc-guest-trophy">🏆</span>
              <div>
                <div className="wc-guest-title">Join the prediction game</div>
                <div className="wc-guest-sub">Sign up free — predict match scores, earn points, and compete with friends</div>
              </div>
            </div>
            <div className="wc-guest-actions">
              <Link to="/signup" className="wc-btn wc-btn-primary">Create Account</Link>
              <Link to="/login" className="wc-btn wc-btn-secondary">Sign In</Link>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="wc-card">
          <div className="wc-card-title">🏅 Leaderboard</div>
          {loading ? (
            <div className="wc-loading"><div className="wc-spinner" /></div>
          ) : leaderboard.length === 0 ? (
            <div className="wc-empty">No predictions yet. <Link to="/wc/matches" style={{ color: 'var(--wc-gold)' }}>Be first →</Link></div>
          ) : (
            <>
              <div className="wc-lb-header">
                <div>#</div>
                <div>Player</div>
                <div style={{ textAlign: 'center' }}>Points</div>
                <div style={{ textAlign: 'center' }}>Preds</div>
                <div style={{ textAlign: 'center' }}>Exact</div>
                <div style={{ textAlign: 'center' }}>Tourn.</div>
              </div>
              <div className="wc-leaderboard">
                {leaderboard.map(entry => (
                  <div
                    key={entry.user_id}
                    className={`wc-lb-row ${entry.username === user?.username ? 'is-me' : ''}`}
                  >
                    <div className={`wc-lb-rank ${entry.rank <= 3 ? `rank-${entry.rank}` : ''}`}>
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                    </div>
                    <div className="wc-lb-name">
                      {entry.username}
                      {entry.username === user?.username && <span className="me-badge">YOU</span>}
                    </div>
                    <div className="wc-lb-pts">{entry.total_points}</div>
                    <div className="wc-lb-cell">{entry.predictions_made}</div>
                    <div className="wc-lb-cell">{entry.exact_scores}</div>
                    <div className="wc-lb-cell">{entry.tournament_points}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <Link to="/wc/matches" className="wc-btn wc-btn-primary">⚽ Make Predictions</Link>
          <Link to="/wc/tournament" className="wc-btn wc-btn-secondary">🌍 Tournament Winner</Link>
        </div>
      </div>
    </WCLayout>
  );
};

export default WCHome;
