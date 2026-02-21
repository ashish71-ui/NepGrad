import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { University, Application } from '../services/universityService';
import universityService from '../services/universityService';
import './UniversityDetail.css';

interface UniversityDetailProps {
  university: University;
  isAdmin: boolean;
  hasApplied: boolean;
  onApplyChange: (universityId: number, applied: boolean) => void;
}

const UniversityDetail: React.FC<UniversityDetailProps> = ({ 
  university, 
  isAdmin, 
  hasApplied,
  onApplyChange 
}) => {
  const navigate = useNavigate();
  const [applying, setApplying] = React.useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleApply = async () => {
    if (hasApplied) {
      // Find the application and withdraw
      try {
        const apps = await universityService.getMyApplications();
        const app = apps.find((a: Application) => a.university === university.id);
        if (app) {
          await universityService.withdrawApplication(app.id);
          onApplyChange(university.id, false);
        }
      } catch (err) {
        console.error('Failed to withdraw:', err);
      }
      return;
    }
    
    try {
      setApplying(true);
      await universityService.applyToUniversity(university.id);
      onApplyChange(university.id, true);
    } catch (err) {
      console.error('Failed to apply:', err);
      alert('Failed to apply. You may have already applied.');
    } finally {
      setApplying(false);
    }
  };

  const handleEdit = () => {
    navigate(`/universities/${university.id}/edit`);
  };

  return (
    <div className="university-detail">
      <div className="detail-header">
        <div className="university-logo-large">
          {university.logo ? (
            <img src={university.logo} alt={university.name} />
          ) : (
            <span className="logo-placeholder">{university.name.charAt(0)}</span>
          )}
        </div>
        <div className="university-title">
          <h1>{university.name}</h1>
          <p className="location">
            📍 {university.city}, {university.country}
          </p>
          <span className="type-badge">{university.university_type_display || university.university_type}</span>
        </div>
      </div>

      <div className="detail-actions">
        {isAdmin && (
          <button onClick={handleEdit} className="btn-edit">
            ✏️ Edit University
          </button>
        )}
        <button 
          onClick={handleApply} 
          className={`btn-apply ${hasApplied ? 'applied' : ''}`}
          disabled={hasApplied || applying}
        >
          {hasApplied ? '✓ Applied' : applying ? 'Applying...' : '🎓 Apply Now'}
        </button>
      </div>

      {university.description && (
        <div className="detail-section">
          <h2>About</h2>
          <p>{university.description}</p>
        </div>
      )}

      <div className="detail-grid">
        <div className="detail-card highlight">
          <div className="card-icon">🏆</div>
          <div className="card-content">
            <span className="card-label">World Ranking</span>
            <span className="card-value">#{university.ranking || 'N/A'}</span>
          </div>
        </div>

        <div className="detail-card highlight">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <span className="card-label">Tuition/Year</span>
            <span className="card-value">{formatCurrency(university.tuition_fee)}</span>
          </div>
        </div>

        <div className="detail-card highlight">
          <div className="card-icon">📋</div>
          <div className="card-content">
            <span className="card-label">Admission Rate</span>
            <span className="card-value">{university.admission_rate_display || 'N/A'}</span>
          </div>
        </div>

        <div className="detail-card highlight">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <span className="card-label">Deadline</span>
            <span className="card-value">{formatDate(university.deadline)}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h2>📍 Location</h2>
        <div className="info-list">
          <div className="info-row">
            <span className="info-label">Country</span>
            <span className="info-value">{university.country}</span>
          </div>
          <div className="info-row">
            <span className="info-label">City</span>
            <span className="info-value">{university.city}</span>
          </div>
          {university.address && (
            <div className="info-row">
              <span className="info-label">Address</span>
              <span className="info-value">{university.address}</span>
            </div>
          )}
        </div>
      </div>

      <div className="detail-section">
        <h2>💵 Financial</h2>
        <div className="info-list">
          <div className="info-row">
            <span className="info-label">Application Fee</span>
            <span className="info-value">{formatCurrency(university.application_fee)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Tuition Fee (Yearly)</span>
            <span className="info-value">{formatCurrency(university.tuition_fee)}</span>
          </div>
          {university.founded_year && (
            <div className="info-row">
              <span className="info-label">Founded Year</span>
              <span className="info-value">{university.founded_year}</span>
            </div>
          )}
        </div>
      </div>

      <div className="detail-section">
        <h2>📝 Requirements</h2>
        <div className="requirements-grid">
          {university.ielts_score && (
            <div className="requirement-item">
              <span className="req-label">IELTS</span>
              <span className="req-value">{university.ielts_score}+</span>
            </div>
          )}
          {university.toefl_score && (
            <div className="requirement-item">
              <span className="req-label">TOEFL</span>
              <span className="req-value">{university.toefl_score}+</span>
            </div>
          )}
          {university.gre_score && (
            <div className="requirement-item">
              <span className="req-label">GRE</span>
              <span className="req-value">{university.gre_score}+</span>
            </div>
          )}
          {university.gmat_score && (
            <div className="requirement-item">
              <span className="req-label">GMAT</span>
              <span className="req-value">{university.gmat_score}+</span>
            </div>
          )}
        </div>
      </div>

      {university.scholarships_available && (
        <div className="detail-section scholarship-section">
          <h2>🎓 Scholarships Available</h2>
          <p>{university.scholarships_description || 'Scholarships are available for eligible students.'}</p>
        </div>
      )}

      <div className="detail-section">
        <h2>📞 Contact</h2>
        <div className="info-list">
          {university.email && (
            <div className="info-row">
              <span className="info-label">Email</span>
              <span className="info-value">{university.email}</span>
            </div>
          )}
          {university.phone && (
            <div className="info-row">
              <span className="info-label">Phone</span>
              <span className="info-value">{university.phone}</span>
            </div>
          )}
          {university.website && (
            <div className="info-row">
              <span className="info-label">Website</span>
              <a href={university.website} target="_blank" rel="noopener noreferrer" className="info-link">
                {university.website}
              </a>
            </div>
          )}
        </div>
      </div>

      {university.programs && university.programs.length > 0 && (
        <div className="detail-section">
          <h2>🎓 Programs Offered</h2>
          <div className="programs-list">
            {university.programs.map(program => (
              <div key={program.id} className="program-card">
                <h4>{program.name}</h4>
                <span className="program-degree">{program.degree_type}</span>
                {program.duration_years && (
                  <span className="program-duration">{program.duration_years} years</span>
                )}
                {program.tuition_fee && (
                  <span className="program-fee">{formatCurrency(program.tuition_fee)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="detail-footer">
        <Link to="/universities" className="btn-back">
          ← Back to Universities
        </Link>
      </div>
    </div>
  );
};

export default UniversityDetail;
