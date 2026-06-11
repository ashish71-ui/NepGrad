import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import UniversityList from './pages/UniversityList';
import UniversityForm from './pages/UniversityForm';
import WCHome from './pages/wc/WCHome';
import WCMatches from './pages/wc/WCMatches';
import WCTournament from './pages/wc/WCTournament';
import WCAdmin from './pages/wc/WCAdmin';
import './App.css';

// Global Navigation Component
const GlobalNav: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  if (!user) {
    return (
      <nav className="global-nav">
        <Link to="/" className="global-nav-brand">
          <div className="global-nav-logo">N</div>
          <span className="global-nav-title">NepGrad</span>
        </Link>

        <div className="global-nav-links">
          <Link to="/universities" className="global-nav-link">Browse Universities</Link>
        </div>

        <div className="global-nav-auth">
          <Link to="/login" className="global-nav-link">Sign In</Link>
          <Link to="/signup" className="global-nav-cta">Get Started</Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="global-nav">
      <Link to="/dashboard" className="global-nav-brand">
        <div className="global-nav-logo">N</div>
        <span className="global-nav-title">NepGrad</span>
      </Link>

      <div className="global-nav-links">
        <Link to="/dashboard" className="global-nav-link">Dashboard</Link>
        <Link to="/universities" className="global-nav-link">Universities</Link>
        <Link to="/wc" className="global-nav-link">🏆 WC Predictor</Link>
      </div>

      <div className="global-nav-user">
        <div className="global-nav-user-info">
          <div className="global-nav-user-name">{user.first_name || user.username || 'User'}</div>
          <div className="global-nav-user-role">{user.is_staff ? 'Administrator' : 'Student'}</div>
        </div>
        <div className="global-nav-avatar">
          {(user.first_name || user.username || 'U').charAt(0).toUpperCase()}
        </div>
        <button onClick={handleLogout} className="global-nav-logout">
          Logout
        </button>
      </div>
    </nav>
  );
};

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="home-eyebrow">🎓 University Application Tracker</div>
        <h1>Find &amp; Track Your<br/><span className="home-accent">Perfect Programme</span></h1>
        <p>Discover programs at top German universities, compare requirements and deadlines, and manage all your applications in one place.</p>

        <div className="home-buttons">
          <a href="/universities" className="home-button primary">Browse Universities →</a>
          <a href="/signup" className="home-button secondary">Create Free Account</a>
        </div>
        <p className="home-note">No account needed to browse &nbsp;·&nbsp; Free to sign up</p>

        <div className="home-features">
          <div className="home-feature">
            <span className="home-feature-icon">🔍</span>
            <div>
              <strong>Browse &amp; Compare</strong>
              <span>Programs, fees, deadlines</span>
            </div>
          </div>
          <div className="home-feature">
            <span className="home-feature-icon">📅</span>
            <div>
              <strong>Track Deadlines</strong>
              <span>Never miss a cut-off</span>
            </div>
          </div>
          <div className="home-feature">
            <span className="home-feature-icon">✓</span>
            <div>
              <strong>Manage Applications</strong>
              <span>Mark where you've applied</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const UniversitiesPage: React.FC = () => {
  const { user } = useAuth();
  return <UniversityList isAdmin={user?.is_staff || false} />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <GlobalNav />
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/universities/new"
            element={
              <ProtectedRoute>
                <GlobalNav />
                <UniversityForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/universities/:id/edit"
            element={
              <ProtectedRoute>
                <GlobalNav />
                <UniversityForm isEditing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/universities"
            element={
              <>
                <GlobalNav />
                <UniversitiesPage />
              </>
            }
          />
          {/* WC Predictor — standalone dark-themed app */}
          <Route path="/wc" element={<WCHome />} />
          <Route path="/wc/matches" element={<WCMatches />} />
          <Route path="/wc/tournament" element={<WCTournament />} />
          <Route
            path="/wc/admin"
            element={
              <ProtectedRoute>
                <WCAdmin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
