import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import universityService from '../services/universityService';
import type { DashboardStats } from '../services/universityService';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

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

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>NepGrad</h1>
        <div className="header-right">
          <span className="user-name">
            {user?.first_name} {user?.last_name || user?.username}
          </span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome{user?.first_name ? `, ${user.first_name}` : ''}!</h2>
          <p>Track your university applications and find your dream education.</p>
        </div>

        {/* Stats Section */}
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-icon">🎓</div>
            <div className="stat-content">
              <h3>Universities Applied</h3>
              <p className="stat-number">{loading ? '...' : stats?.applied_count || 0}</p>
            </div>
          </div>

          {user?.is_staff && (
            <div className="stat-card">
              <div className="stat-icon">➕</div>
              <div className="stat-content">
                <h3>Universities Added</h3>
                <p className="stat-number">{loading ? '...' : stats?.added_count || 0}</p>
              </div>
            </div>
          )}

          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <h3>Total Applications</h3>
              <p className="stat-number">{loading ? '...' : stats?.applied_count || 0}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="dashboard-actions">
          <Link to="/universities" className="action-button primary">
            See Universities →
          </Link>
          
          {user?.is_staff && (
            <Link to="/universities/new" className="action-button secondary">
              + Add University
            </Link>
          )}
        </div>

        {/* Recent Applications */}
        {stats?.recent_applications && stats.recent_applications.length > 0 && (
          <div className="recent-applications">
            <h3>Recent Applications</h3>
            <div className="application-list">
              {stats.recent_applications.map((app) => (
                <div key={app.id} className="application-item">
                  <div className="application-info">
                    <h4>{app.university_name}</h4>
                    <p>{app.university_city}, {app.university_country}</p>
                  </div>
                  <div className={`application-status ${app.status}`}>
                    {app.status_display}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!stats?.recent_applications || stats.recent_applications.length === 0) && (
          <div className="no-applications">
            <p>You haven't applied to any universities yet.</p>
            <Link to="/universities" className="action-button primary">
              Browse Universities →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
