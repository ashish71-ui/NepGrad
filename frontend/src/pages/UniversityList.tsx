import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import universityService from '../services/universityService';
import type { University, Application } from '../services/universityService';
import UniversityDetail from './UniversityDetail';
import './UniversityList.css';

interface UniversityListProps {
  isAdmin?: boolean;
}

type ViewMode = 'grid' | 'list';

const UniversityList: React.FC<UniversityListProps> = ({ isAdmin = false }) => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 9;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showScholarshipsOnly, setShowScholarshipsOnly] = useState(false);

  // Get unique countries and types from data
  const countries = useMemo(() => {
    const unique = new Set(universities.map(u => u.country).filter(Boolean));
    return Array.from(unique).sort();
  }, [universities]);

  const universityTypes = useMemo(() => {
    const unique = new Set(universities.map(u => u.university_type).filter(Boolean));
    return Array.from(unique).sort();
  }, [universities]);

  // Check if user has applied to a university
  const hasAppliedTo = (universityId: number) => {
    return applications.some(app => app.university === universityId);
  };

  // Handle apply/withdraw directly from list
  const handleApplyToggle = async (e: React.MouseEvent, universityId: number) => {
    const applied = hasAppliedTo(universityId);
    
    if (applied) {
      // Find the application and withdraw
      const app = applications.find(a => a.university === universityId);
      if (app) {
        try {
          await universityService.withdrawApplication(app.id);
          loadApplications();
        } catch (err) {
          console.error('Failed to withdraw:', err);
        }
      }
    } else {
      // Apply to university
      try {
        await universityService.applyToUniversity(universityId);
        loadApplications();
      } catch (err) {
        console.error('Failed to apply:', err);
        alert('Failed to apply. Please try again.');
      }
    }
  };

  // Handle edit
  const handleEdit = (e: React.MouseEvent, universityId: number) => {
    e.stopPropagation();
    window.location.href = `/universities/${universityId}/edit`;
  };

  // Handle apply status change
  const handleApplyChange = (universityId: number, applied: boolean) => {
    if (applied) {
      // Refresh applications
      universityService.getMyApplications().then(setApplications).catch(console.error);
    }
  };

  // Load universities when any dependency changes
  useEffect(() => {
    loadUniversities();
    loadApplications();
  }, [isAdmin, currentPage, searchQuery, selectedCountry, selectedType, showScholarshipsOnly]);

  const loadUniversities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        page: currentPage,
        page_size: pageSize,
        search: searchQuery || undefined,
        country: selectedCountry || undefined,
        type: selectedType || undefined,
        scholarships: showScholarshipsOnly || undefined,
      };

      const data = isAdmin 
        ? await universityService.getMyUniversities(filters)
        : await universityService.getUniversities(filters);
      
      if ('results' in data) {
        setUniversities(data.results);
        setTotalCount(data.count);
      } else {
        setUniversities(data as University[]);
        setTotalCount((data as University[]).length);
      }
    } catch (err) {
      setError('Failed to load universities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const apps = await universityService.getMyApplications();
      setApplications(apps);
    } catch (err) {
      console.error('Failed to load applications:', err);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    setCurrentPage(1);
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    setCurrentPage(1);
  };

  const handleScholarshipsChange = (checked: boolean) => {
    setShowScholarshipsOnly(checked);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCountry('');
    setSelectedType('');
    setShowScholarshipsOnly(false);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  const isDeadlineApproaching = (deadline: string | null) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 30;
  };

  const isDeadlinePassed = (deadline: string | null) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    return deadlineDate < today;
  };

  const hasActiveFilters = searchQuery || selectedCountry || selectedType || showScholarshipsOnly;

  // Handle clicking on a card to view details
  const handleCardClick = (university: University) => {
    setSelectedUniversity(university);
  };

  // Handle back to list
  const handleBackToList = () => {
    setSelectedUniversity(null);
  };

  // Render pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return (
      <div className="pagination">
        <button 
          className="pagination-btn"
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          ← Previous
        </button>
        
        <div className="pagination-pages">
          {pages.map((page, idx) => (
            typeof page === 'number' ? (
              <button
                key={idx}
                className={`pagination-page ${page === currentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ) : (
              <span key={idx} className="pagination-ellipsis">{page}</span>
            )
          ))}
        </div>

        <button 
          className="pagination-btn"
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Next →
        </button>
      </div>
    );
  };

  // Render grid card
  const renderGridCard = (university: University) => {
    const applied = hasAppliedTo(university.id);
    
    return (
      <div key={university.id} className="university-card" onClick={() => handleCardClick(university)}>
        <div className="university-card-header">
          <div className="university-logo">
            {university.logo ? (
              <img src={university.logo} alt={university.name} />
            ) : (
              <span className="logo-placeholder">
                {university.name.charAt(0)}
              </span>
            )}
          </div>
          <div className="university-info">
            <h3>{university.name}</h3>
            <p className="location">
              <span className="location-icon">📍</span>
              {university.city}, {university.country}
            </p>
          </div>
        </div>

        <div className="university-card-body">
          <div className="university-stats">
            {university.ranking && (
              <div className="stat">
                <span className="stat-label">Ranking</span>
                <span className="stat-value">#{university.ranking}</span>
              </div>
            )}
            <div className="stat">
              <span className="stat-label">Admission Rate</span>
              <span className="stat-value">
                {university.admission_rate_display || 'N/A'}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Tuition/Year</span>
              <span className="stat-value tuition">
                {formatCurrency(university.tuition_fee)}
              </span>
            </div>
            {university.program_count !== undefined && (
              <div className="stat">
                <span className="stat-label">Programs</span>
                <span className="stat-value">{university.program_count}</span>
              </div>
            )}
          </div>

          {university.scholarships_available && (
            <div className="scholarship-badge">
              🎓 Scholarships Available
            </div>
          )}

          <div className={`deadline ${isDeadlinePassed(university.deadline) ? 'passed' : isDeadlineApproaching(university.deadline) ? 'approaching' : ''}`}>
            <span className="deadline-label">📅 Deadline:</span>
            <span className="deadline-value">
              {formatDate(university.deadline)}
              {isDeadlineApproaching(university.deadline) && (
                <span className="urgent-badge">Urgent</span>
              )}
            </span>
          </div>
        </div>

        <div className="university-card-footer">
          <span className="type-badge">{university.university_type}</span>
          <div className="card-actions">
            {isAdmin && (
              <button 
                className="btn-edit-card" 
                onClick={(e) => handleEdit(e, university.id)}
                title="Edit"
              >
                ✏️
              </button>
            )}
            {!applied && (
              <button 
                className={`btn-apply-card ${applied ? 'applied' : ''}`}
                onClick={(e) => handleApplyToggle(e, university.id)}
              >
                Apply
              </button>
            )}
            {applied && (
              <span className="applied-text">✓ Applied</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render list row
  const renderListRow = (university: University) => {
    const applied = hasAppliedTo(university.id);
    
    return (
      <div key={university.id} className="university-list-row" onClick={() => handleCardClick(university)}>
        <div className="row-logo">
          {university.logo ? (
            <img src={university.logo} alt={university.name} />
          ) : (
            <span className="logo-placeholder">
              {university.name.charAt(0)}
            </span>
          )}
        </div>
        
        <div className="row-main">
          <div className="row-header">
            <h3>{university.name}</h3>
            <span className="type-badge">{university.university_type}</span>
          </div>
          
          <div className="row-location">
            <span className="location-icon">📍</span>
            {university.city}, {university.country}
          </div>
          
          <div className="row-details">
            {university.ranking && (
              <span className="detail-item">
                <strong>#{university.ranking}</strong> Ranking
              </span>
            )}
            <span className="detail-item">
              Admission: {university.admission_rate_display || 'N/A'}
            </span>
            <span className="detail-item tuition">
              {formatCurrency(university.tuition_fee)}/year
            </span>
            {university.program_count !== undefined && (
              <span className="detail-item">
                {university.program_count} Programs
              </span>
            )}
          </div>
        </div>

        <div className="row-badges">
          {university.scholarships_available && (
            <div className="scholarship-badge">🎓 Scholarships</div>
          )}
          
          <div className={`deadline ${isDeadlinePassed(university.deadline) ? 'passed' : isDeadlineApproaching(university.deadline) ? 'approaching' : ''}`}>
            <span className="deadline-label">Deadline:</span>
            <span className="deadline-value">
              {formatDate(university.deadline)}
              {isDeadlineApproaching(university.deadline) && (
                <span className="urgent-badge">Urgent</span>
              )}
            </span>
          </div>
        </div>

        <div className="row-actions">
          {isAdmin && (
            <button 
              className="btn-edit-card" 
              onClick={(e) => handleEdit(e, university.id)}
              title="Edit"
            >
              ✏️ Edit
            </button>
          )}
          {!applied && (
            <button 
              className="btn-apply-card"
              onClick={(e) => handleApplyToggle(e, university.id)}
            >
              Apply
            </button>
          )}
          {applied && (
            <span className="applied-text">✓ Applied</span>
          )}
        </div>
      </div>
    );
  };

  // Show loading
  if (loading && universities.length === 0) {
    return (
      <div className="university-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading universities...</p>
      </div>
    );
  }

  // Show error
  if (error && universities.length === 0) {
    return (
      <div className="university-list-error">
        <p>{error}</p>
        <button onClick={loadUniversities} className="retry-button">Retry</button>
      </div>
    );
  }

  // Show university detail view
  if (selectedUniversity) {
    return (
      <UniversityDetail 
        university={selectedUniversity} 
        isAdmin={isAdmin}
        hasApplied={hasAppliedTo(selectedUniversity.id)}
        onApplyChange={handleApplyChange}
      />
    );
  }

  return (
    <div className="university-list">
      <div className="university-list-header">
        <h2>{isAdmin ? 'My Universities' : 'Find Your Dream University'}</h2>
        {isAdmin && (
          <Link to="/universities/new" className="add-button">
            + Add University
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-form">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search universities by name..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="filter-actions">
          <div className="filter-dropdowns">
            <select 
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="filter-select"
            >
              <option value="">All Countries</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>

            <select 
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="filter-select"
            >
              <option value="">All Types</option>
              {universityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showScholarshipsOnly}
                onChange={(e) => handleScholarshipsChange(e.target.checked)}
              />
              <span className="checkbox-custom"></span>
              Scholarships
            </label>
          </div>

          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ▦
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <button className="clear-filters" onClick={clearFilters}>
          ✕ Clear Filters
        </button>
      )}

      {/* Results Count */}
      <div className="results-info">
        <span>
          Showing {universities.length} of {totalCount} universities
        </span>
      </div>

      {universities.length === 0 ? (
        <div className="university-list-empty">
          <div className="empty-icon">🏫</div>
          <p>No universities found.</p>
          {hasActiveFilters && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
          {isAdmin && (
            <Link to="/universities/new" className="add-button">
              Add University
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <>
          <div className="university-grid">
            {universities.map(renderGridCard)}
          </div>
          {renderPagination()}
        </>
      ) : (
        <>
          <div className="university-list-view">
            {universities.map(renderListRow)}
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );
};

export default UniversityList;
