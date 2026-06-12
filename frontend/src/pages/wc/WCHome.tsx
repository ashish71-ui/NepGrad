import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import wcService, {
  type LeaderboardEntry,
  type MyStats,
  type PointsConfig,
  type TournamentResult,
} from '../../services/wcService';
import WCLayout from './WCLayout';
import { useAuth } from '../../context/AuthContext';
import { useWCGroup } from './WCGroupContext';

// ── Join form ────────────────────────────────────────────────────────────────
const JoinGroupForm: React.FC<{ onJoined: () => void }> = ({ onJoined }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!code.trim()) { setError('Please enter a join code.'); return; }
    setError(null);
    setLoading(true);
    try {
      await wcService.joinGroup(code.trim().toUpperCase());
      onJoined();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 440,
      margin: '60px auto 0',
      background: 'var(--wc-bg-card)',
      border: '1px solid var(--wc-border)',
      borderRadius: 16,
      padding: 36,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
      <h2 style={{ color: 'var(--wc-text)', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
        Enter Your Group Code
      </h2>
      <p style={{ color: 'var(--wc-text-muted)', fontSize: 14, margin: '0 0 28px', lineHeight: 1.5 }}>
        Ask your group admin for the 6-character code to join and start predicting.
      </p>

      {error && (
        <div className="wc-alert wc-alert-error" style={{ marginBottom: 16, textAlign: 'left' }}>
          <span>⚠</span><span>{error}</span>
        </div>
      )}

      <input
        className="wc-input"
        style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 16 }}
        placeholder="ABC123"
        maxLength={6}
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        onKeyDown={e => e.key === 'Enter' && handleJoin()}
      />
      <button
        className="wc-btn wc-btn-primary"
        style={{ width: '100%', justifyContent: 'center', fontSize: 15 }}
        disabled={loading || code.length !== 6}
        onClick={handleJoin}
      >
        {loading ? '…Joining' : 'Join Group'}
      </button>
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────
const WCHome: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { myGroup, loading: groupLoading, refetch } = useWCGroup();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [config, setConfig] = useState<PointsConfig | null>(null);
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [lbLoading, setLbLoading] = useState(true);

  const isAdmin = user?.is_staff ?? false;
  const hasAccess = isAdmin || !!myGroup;

  useEffect(() => {
    if (groupLoading) return;
    const load = async () => {
      try {
        const [cfg, res] = await Promise.all([
          wcService.getPointsConfig(),
          wcService.getTournamentResult(),
        ]);
        setConfig(cfg);
        setResult(res);

        if (hasAccess) {
          const groupId = myGroup?.id;
          const lb = await wcService.getLeaderboard(isAdmin ? undefined : groupId);
          setLeaderboard(lb);
        }

        if (isAuthenticated) {
          const stats = await wcService.getMyStats();
          setMyStats(stats);
        }
      } finally {
        setLbLoading(false);
      }
    };
    load();
  }, [groupLoading, hasAccess, isAuthenticated, isAdmin, myGroup?.id]);

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <WCLayout>
        <div className="wc-page">
          <div className="wc-page-header">
            <h1 className="wc-page-title">🏆 World Cup Predictor</h1>
            <p className="wc-page-subtitle">Predict scores, earn points, compete with friends</p>
          </div>
          <div className="wc-guest-banner">
            <div className="wc-guest-banner-left">
              <span className="wc-guest-trophy">🏆</span>
              <div>
                <div className="wc-guest-title">Join the prediction game</div>
                <div className="wc-guest-sub">Sign up free — predict match scores, earn points, and compete with your group</div>
              </div>
            </div>
            <div className="wc-guest-actions">
              <Link to="/signup" className="wc-btn wc-btn-primary">Create Account</Link>
              <Link to="/login" className="wc-btn wc-btn-secondary">Sign In</Link>
            </div>
          </div>
          {config && <PointsBreakdown config={config} />}
        </div>
      </WCLayout>
    );
  }

  // ── Logged in but not in a group (non-admin) ───────────────────────────────
  if (!groupLoading && !hasAccess) {
    return (
      <WCLayout>
        <div className="wc-page">
          <div className="wc-page-header">
            <h1 className="wc-page-title">🏆 World Cup Predictor</h1>
            <p className="wc-page-subtitle">You need a group code to start predicting</p>
          </div>
          {config && <PointsBreakdown config={config} />}
          <JoinGroupForm onJoined={refetch} />
        </div>
      </WCLayout>
    );
  }

  // ── Logged in and has access ───────────────────────────────────────────────
  const myEntry = leaderboard.find(e => e.username === user?.username);

  return (
    <WCLayout>
      <div className="wc-page">
        <div className="wc-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="wc-page-title">🏆 World Cup Predictor</h1>
            <p className="wc-page-subtitle">
              {myGroup ? (
                <>Group: <strong style={{ color: 'var(--wc-gold)' }}>{myGroup.name}</strong></>
              ) : (
                'All groups (admin view)'
              )}
            </p>
          </div>
          {myGroup && (
            <div style={{ fontSize: 12, color: 'var(--wc-text-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--wc-border)', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
              <div style={{ marginBottom: 2 }}>Group Code</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 4, color: 'var(--wc-gold)' }}>{myGroup.code}</div>
            </div>
          )}
        </div>

        {/* Tournament result banner */}
        {result?.is_final && (
          <div className="wc-card" style={{ marginBottom: 24, borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 36 }}>🏆</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--wc-gold)', marginBottom: 4 }}>Tournament Champion</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--wc-text)' }}>{result.winner?.flag} {result.winner?.name}</div>
              </div>
              {result.runner_up && (
                <>
                  <div style={{ width: 1, height: 40, background: 'var(--wc-border)' }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--wc-text-muted)', marginBottom: 4 }}>Runner-up</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--wc-text)' }}>{result.runner_up.flag} {result.runner_up.name}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* My stats */}
        {myStats && (
          <div className="wc-stats-bar">
            <div className="wc-stat-card">
              <div className="wc-stat-label">My Points</div>
              <div className="wc-stat-value">{myStats.total_points}</div>
              <div className="wc-stat-sub">Rank #{myEntry?.rank ?? '—'}</div>
            </div>
            <div className="wc-stat-card">
              <div className="wc-stat-label">Exact Scores</div>
              <div className="wc-stat-value">{myStats.exact_scores}</div>
              <div className="wc-stat-sub">{myStats.exact_scores > 0 ? `+${myStats.exact_scores * (config?.exact_score ?? 5)} pts` : 'none yet'}</div>
            </div>
            <div className="wc-stat-card">
              <div className="wc-stat-label">Predictions</div>
              <div className="wc-stat-value">{myStats.predictions_made}</div>
              <div className="wc-stat-sub">{myStats.matches_completed} completed</div>
            </div>
            <div className="wc-stat-card">
              <div className="wc-stat-label">Tourn. Pts</div>
              <div className="wc-stat-value">{myStats.tournament_points}</div>
              <div className="wc-stat-sub">winner + runner-up</div>
            </div>
            <div className="wc-stat-card">
              <div className="wc-stat-label">Rankings Pts</div>
              <div className="wc-stat-value">{myStats.ranking_points ?? 0}</div>
              <div className="wc-stat-sub">top 3 + final</div>
            </div>
          </div>
        )}

        {config && <PointsBreakdown config={config} />}

        {/* Leaderboard */}
        <div className="wc-card">
          <div className="wc-card-title">
            🏅 {myGroup ? `${myGroup.name} Leaderboard` : 'Global Leaderboard'}
          </div>
          {lbLoading ? (
            <div className="wc-loading"><div className="wc-spinner" /></div>
          ) : leaderboard.length === 0 ? (
            <div className="wc-empty">No predictions yet. <Link to="/wc/matches" style={{ color: 'var(--wc-gold)' }}>Be first →</Link></div>
          ) : (
            <>
              <div className="wc-lb-header wc-lb-header-7">
                <div>#</div>
                <div>Player</div>
                <div style={{ textAlign: 'center' }}>Points</div>
                <div style={{ textAlign: 'center' }}>Preds</div>
                <div style={{ textAlign: 'center' }}>Exact</div>
                <div style={{ textAlign: 'center' }}>Tourn.</div>
                <div style={{ textAlign: 'center' }}>Rank.</div>
              </div>
              <div className="wc-leaderboard">
                {leaderboard.map(entry => (
                  <div key={entry.user_id} className={`wc-lb-row wc-lb-row-7 ${entry.username === user?.username ? 'is-me' : ''}`}>
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
                    <div className="wc-lb-cell">{entry.ranking_points ?? 0}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <Link to="/wc/matches" className="wc-btn wc-btn-primary">⚽ Make Predictions</Link>
          <Link to="/wc/tournament" className="wc-btn wc-btn-secondary">🌍 Tournament Winner</Link>
        </div>
      </div>
    </WCLayout>
  );
};

const PointsBreakdown: React.FC<{ config: PointsConfig }> = ({ config }) => (
  <div className="wc-points-breakdown" style={{ marginBottom: 28 }}>
    <div className="wc-pb-title">⭐ Points System</div>
    <div className="wc-pb-row"><span>🎯 Exact score</span><span className="wc-pb-pts">+{config.exact_score} pts</span></div>
    <div className="wc-pb-row"><span>✅ Correct winner / draw</span><span className="wc-pb-pts">+{config.correct_winner} pts</span></div>
    <div className="wc-pb-row"><span>↔ Correct goal difference</span><span className="wc-pb-pts">+{config.correct_goal_difference} pts</span></div>
    <div className="wc-pb-row"><span>🏆 Tournament winner</span><span className="wc-pb-pts">+{config.tournament_winner} pts</span></div>
    <div className="wc-pb-row"><span>🥈 Runner-up prediction</span><span className="wc-pb-pts">+{config.tournament_runner_up} pts</span></div>
  </div>
);

export default WCHome;
