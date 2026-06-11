import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import universityService from '../services/universityService';
import type { DashboardStats } from '../services/universityService';
import './Dashboard.css';

/* ── Inline SVG icons ── */
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboardStats(); }, []);

  const loadDashboardStats = async () => {
    try {
      const data = await universityService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const f = user?.first_name?.[0] ?? '';
    const l = user?.last_name?.[0] ?? '';
    return (f + l).toUpperCase() || user?.username?.[0]?.toUpperCase() || '?';
  };

  const fullName = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ''}`.trim()
    : user?.username ?? '';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const pendingCount  = stats?.recent_applications?.filter(a => a.status_display?.toLowerCase() === 'pending').length ?? 0;
  const acceptedCount = stats?.recent_applications?.filter(a => a.status_display?.toLowerCase() === 'accepted').length ?? 0;
  const appliedCount  = loading ? null : (stats?.applied_count ?? 0);
  const addedCount    = loading ? null : (stats?.added_count ?? 0);
  const successRate   = appliedCount && appliedCount > 0
    ? `${Math.round((acceptedCount / appliedCount) * 100)}%`
    : '—';

  return (
    <div className="dashboard-container">

      {/* ── Header ── */}
      {/* <header className="dashboard-header">
        <div className="header-logo">
          <div className="logo-mark">
            <svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2L2 14h12L8 2z"/>
            </svg>
          </div>
          <span className="logo-name">NepGrad</span>
        </div>

        <div className="header-right">
          <div className="user-chip">
            <div className="user-avatar-sm">{getInitials()}</div>
            <span className="user-name-sm">{fullName}</span>
          </div>
          <div className="sep"/>
          <button className="logout-button" onClick={logout}>
            <IconLogout/> Sign out
          </button>
        </div>
      </header> */}

      {/* ── Content ── */}
      <main className="dashboard-content">

        {/* ══ TOP ROW: welcome | actions | profile ══ */}
        <div className="top-row">

          {/* Welcome */}
          <div className="welcome-card">
            <div>
              <p className="welcome-tag">Dashboard overview</p>
              <h1>{greeting()}{user?.first_name ? `, ${user.first_name}` : ''}.</h1>
              <p className="sub">Your university application tracker — all in one place.</p>
            </div>
            <p className="welcome-date">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="actions-card">
            <div className="card-header">
              <span className="card-title">Quick Actions</span>
            </div>
            <div className="action-list">
              <Link to="/universities" className="action-btn primary">
                <IconSearch/> Browse Universities
              </Link>
              {user?.is_staff ? (
                <Link to="/universities/new" className="action-btn secondary">
                  <IconPlus/> Add University
                </Link>
              ) : (
                <Link to="/profile" className="action-btn ghost">
                  <IconUser/> View Profile
                </Link>
              )}
            </div>
          </div>

          {/* User Profile Card */}
          <div className="profile-card">
            <div className="profile-banner"/>
            <div className="profile-body">
              <div className="profile-head">
                <div className="profile-avatar">{getInitials()}</div>
                <div>
                  <p className="profile-name">{fullName}</p>
                  <p className="profile-role">
                    <span className="profile-role-dot"/>
                    {user?.is_staff ? 'Staff Account' : 'Student Account'}
                  </p>
                </div>
              </div>
              <div className="profile-fields">
                {user?.email && (
                  <div className="profile-field">
                    <span className="field-label">Email</span>
                    <span className="field-value">{user.email}</span>
                  </div>
                )}
                <div className="profile-field">
                  <span className="field-label">Username</span>
                  <span className="field-value">@{user?.username}</span>
                </div>
                <div className="profile-field">
                  <span className="field-label">Role</span>
                  <span className="field-value">{user?.is_staff ? 'Staff' : 'Student'}</span>
                </div>
                <div className="profile-field">
                  <span className="field-label">Applied</span>
                  <span className="field-value">{loading ? '—' : appliedCount}</span>
                </div>
              </div>
            </div>
          </div>

        </div>{/* /top-row */}

        {/* ══ STATS ROW ══ */}
        <div className="stats-section">
          <div className="stat-card c-green">
            <div className="stat-card-top">
              <span className="stat-label">Applied</span>
              <span className="stat-pill">Total</span>
            </div>
            <div className="stat-number">{loading ? '—' : appliedCount}</div>
            <div className="stat-desc">Universities applied to</div>
          </div>

          <div className="stat-card c-purple">
            <div className="stat-card-top">
              <span className="stat-label">Pending</span>
              <span className="stat-pill purple">Active</span>
            </div>
            <div className="stat-number">{loading ? '—' : pendingCount}</div>
            <div className="stat-desc">Awaiting decision</div>
          </div>

          <div className="stat-card c-teal">
            <div className="stat-card-top">
              <span className="stat-label">Accepted</span>
              <span className="stat-pill">Offers</span>
            </div>
            <div className="stat-number">{loading ? '—' : acceptedCount}</div>
            <div className="stat-desc">Offers received</div>
          </div>

          {user?.is_staff ? (
            <div className="stat-card c-rose">
              <div className="stat-card-top">
                <span className="stat-label">Added</span>
                <span className="stat-pill purple">Staff</span>
              </div>
              <div className="stat-number">{loading ? '—' : addedCount}</div>
              <div className="stat-desc">Universities listed</div>
            </div>
          ) : (
            <div className="stat-card c-rose">
              <div className="stat-card-top">
                <span className="stat-label">Success Rate</span>
                <span className="stat-pill purple">Rate</span>
              </div>
              <div className="stat-number">{loading ? '—' : successRate}</div>
              <div className="stat-desc">Acceptance ratio</div>
            </div>
          )}
        </div>

        {/* ══ APPLICATIONS TABLE ══ */}
        <div className="apps-section">
          {stats?.recent_applications && stats.recent_applications.length > 0 ? (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Recent Applications</span>
                <span className="panel-count">{stats.recent_applications.length} records</span>
              </div>
              <div className="table-head">
                <span className="th">Institution</span>
                <span className="th">Location</span>
                <span className="th">Status</span>
              </div>
              <div>
                {stats.recent_applications.map((app, i) => (
                  <div className="app-row" key={i}>
                    <p className="app-uni">{app.university_name}</p>
                    <p className="app-loc">
                      <IconPin/>
                      {app.university_city}, {app.university_country}
                    </p>
                    <span className={`status-badge ${(app.status_display ?? '').toLowerCase()}`}>
                      {app.status_display}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Applications</span>
              </div>
              <div className="empty-state">
                <div className="empty-icon">🗂️</div>
                <h4>No applications yet</h4>
                <p>Browse universities and submit your first application<br/>to start tracking progress here.</p>
                <Link to="/universities" className="action-btn primary" style={{ display: 'inline-flex', width: 'auto' }}>
                  <IconSearch/> Browse Universities
                </Link>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default Dashboard;