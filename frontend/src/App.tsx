import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import UniversityList from './pages/UniversityList';
import UniversityForm from './pages/UniversityForm';
import './App.css';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Welcome to NepGrad</h1>
        <p>Your gateway to educational excellence in Nepal</p>
        <div className="home-buttons">
          <a href="/login" className="home-button primary">Sign In</a>
          <a href="/signup" className="home-button secondary">Create Account</a>
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
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/universities"
            element={
              <ProtectedRoute>
                <UniversitiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/universities/new"
            element={
              <ProtectedRoute>
                <UniversityForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/universities/:id/edit"
            element={
              <ProtectedRoute>
                <UniversityForm isEditing />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
