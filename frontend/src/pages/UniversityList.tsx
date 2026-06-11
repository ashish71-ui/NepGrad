import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import universityService from '../services/universityService';
import type { University, Application } from '../services/universityService';
import UniversityDetail from './UniversityDetail';
import { useAuth } from '../context/AuthContext';
import './UniversityList.css';

interface UniversityListProps {
  isAdmin?: boolean;
}

type ViewMode = 'grid' | 'list' | 'excel';
type SortField = 'name' | 'country' | 'ranking' | 'tuition_fee' | 'deadline' | 'program_count' | 'admission_rate';
type SortDir = 'asc' | 'desc';

interface ExcelColumn {
  key: SortField | null;
  label: string;
  sortable: boolean;
  width: string;
}

const EXCEL_COLS: ExcelColumn[] = [
  { key: 'name',            label: 'University',    sortable: true,  width: '220px' },
  { key: 'country',         label: 'Location',      sortable: true,  width: '150px' },
  { key: null,              label: 'Type',          sortable: false, width: '110px' },
  { key: 'ranking',         label: 'Rank',          sortable: true,  width: '70px'  },
  { key: 'program_count',   label: 'Programs',      sortable: true,  width: '85px'  },
  { key: 'tuition_fee',     label: 'Tuition/yr',    sortable: true,  width: '110px' },
  { key: null,              label: 'App Fee',        sortable: false, width: '90px'  },
  { key: 'deadline',        label: 'Deadline',      sortable: true,  width: '115px' },
  { key: 'admission_rate',  label: 'Accept. %',     sortable: true,  width: '90px'  },
  { key: null,              label: 'Scholarships',  sortable: false, width: '100px' },
  { key: null,              label: 'UniAssist',     sortable: false, width: '90px'  },
];

const UniversityList: React.FC<UniversityListProps> = ({ isAdmin = false }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [universities, setUniversities] = useState<University[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Sort state (client-side, within current page)
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 9;

  // Filters (server-side)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showScholarshipsOnly, setShowScholarshipsOnly] = useState(false);

  // Client-side filters
  const [selectedUniAssist, setSelectedUniAssist] = useState('');

  const countries = useMemo(() => {
    const unique = new Set(universities.map(u => u.country).filter(Boolean));
    return Array.from(unique).sort();
  }, [universities]);

  const universityTypes = useMemo(() => {
    const unique = new Set(universities.map(u => u.university_type).filter(Boolean));
    return Array.from(unique).sort();
  }, [universities]);

  // Client-side filter + sort applied on top of server-fetched data
  const displayUniversities = useMemo(() => {
    let result = universities;

    if (selectedUniAssist === 'yes') {
      result = result.filter(u => u.uniassist_required);
    } else if (selectedUniAssist === 'no') {
      result = result.filter(u => !u.uniassist_required);
    }

    if (!sortField) return result;

    return [...result].sort((a, b) => {
      const aRaw = a[sortField as keyof University] as string | number | null | undefined;
      const bRaw = b[sortField as keyof University] as string | number | null | undefined;

      if (aRaw === null || aRaw === undefined) return sortDir === 'asc' ? 1 : -1;
      if (bRaw === null || bRaw === undefined) return sortDir === 'asc' ? -1 : 1;

      if (sortField === 'deadline') {
        const da = new Date(aRaw as string).getTime();
        const db = new Date(bRaw as string).getTime();
        return sortDir === 'asc' ? da - db : db - da;
      }

      if (typeof aRaw === 'string' && typeof bRaw === 'string') {
        return sortDir === 'asc' ? aRaw.localeCompare(bRaw) : bRaw.localeCompare(aRaw);
      }

      const na = Number(aRaw);
      const nb = Number(bRaw);
      return sortDir === 'asc' ? na - nb : nb - na;
    });
  }, [universities, selectedUniAssist, sortField, sortDir]);

  const hasAppliedTo = (universityId: number) =>
    applications.some(app => app.university === universityId);

  const handleApplyToggle = async (e: React.MouseEvent, universityId: number) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const applied = hasAppliedTo(universityId);
    if (applied) {
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
      try {
        await universityService.applyToUniversity(universityId);
        loadApplications();
      } catch (err) {
        console.error('Failed to apply:', err);
        alert('Failed to apply. Please try again.');
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, universityId: number) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this university?')) {
      try {
        await universityService.deleteUniversity(universityId);
        loadUniversities();
      } catch (err) {
        console.error('Failed to delete university:', err);
        alert('Failed to delete university. Please try again.');
      }
    }
  };

  const handleEdit = (e: React.MouseEvent, universityId: number) => {
    e.stopPropagation();
    window.location.href = `/universities/${universityId}/edit`;
  };

  const handleApplyChange = (_universityId: number, _applied: boolean) => {
    loadApplications();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

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
    if (!isAuthenticated) return;
    try {
      const apps = await universityService.getMyApplications();
      setApplications(apps);
    } catch (err) {
      console.error('Failed to load applications:', err);
    }
  };

  const handleSearchChange = (value: string) => { setSearchQuery(value); setCurrentPage(1); };
  const handleCountryChange = (value: string) => { setSelectedCountry(value); setCurrentPage(1); };
  const handleTypeChange = (value: string) => { setSelectedType(value); setCurrentPage(1); };
  const handleScholarshipsChange = (checked: boolean) => { setShowScholarshipsOnly(checked); setCurrentPage(1); };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCountry('');
    setSelectedType('');
    setShowScholarshipsOnly(false);
    setSelectedUniAssist('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const isDeadlineApproaching = (deadline: string | null) => {
    if (!deadline) return false;
    const d = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
    return d > 0 && d <= 30;
  };

  const isDeadlinePassed = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const daysLeft = (deadline: string | null): number | null => {
    if (!deadline) return null;
    return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  };

  const deadlineCountdown = (deadline: string | null): string => {
    const d = daysLeft(deadline);
    if (d === null) return '';
    if (d < 0)  return 'Closed';
    if (d === 0) return 'Today!';
    if (d === 1) return '1 day left';
    if (d <= 7)  return `${d} days left`;
    if (d <= 30) return `${d} days left`;
    return `${d} days away`;
  };

  const hasActiveFilters = searchQuery || selectedCountry || selectedType || showScholarshipsOnly || selectedUniAssist;

  const handleCardClick = async (university: University) => {
    try {
      setDetailLoading(true);
      const full = await universityService.getUniversity(university.id);
      setSelectedUniversity(full);
    } catch {
      setSelectedUniversity(university);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Apply button helper ──────────────────────────────────────────────────────
  const ApplyButton: React.FC<{ universityId: number; small?: boolean }> = ({ universityId, small }) => {
    const applied = hasAppliedTo(universityId);
    if (!isAuthenticated) {
      return (
        <button
          className={small ? 'excel-btn-signin' : 'btn-apply-card guest'}
          onClick={(e) => { e.stopPropagation(); navigate('/login'); }}
        >
          {small ? 'Sign In' : 'Sign In to Apply'}
        </button>
      );
    }
    if (applied) return <span className={small ? 'excel-applied-badge' : 'applied-text'}>✓ Applied</span>;
    return (
      <button
        className={small ? 'excel-btn-apply' : 'btn-apply-card'}
        onClick={(e) => handleApplyToggle(e, universityId)}
      >
        Apply
      </button>
    );
  };

  // ── Pagination ───────────────────────────────────────────────────────────────
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
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
        <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>← Previous</button>
        <div className="pagination-pages">
          {pages.map((page, idx) =>
            typeof page === 'number' ? (
              <button key={idx} className={`pagination-page ${page === currentPage ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
            ) : (
              <span key={idx} className="pagination-ellipsis">{page}</span>
            )
          )}
        </div>
        <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next →</button>
      </div>
    );
  };

  // ── Grid card ────────────────────────────────────────────────────────────────
  const renderGridCard = (university: University) => (
    <div key={university.id} className="university-card" onClick={() => handleCardClick(university)}>
      <div className="university-card-header">
        <div className="university-logo">
          {university.logo
            ? <img src={university.logo} alt={university.name} />
            : <span className="logo-placeholder">{university.name.charAt(0)}</span>}
        </div>
        <div className="university-info">
          <h3>{university.name}</h3>
          <p className="location"><span className="location-icon">📍</span>{university.city}, {university.country}</p>
        </div>
      </div>

      <div className="university-card-body">
        <div className="university-stats">
          {university.ranking && (
            <div className="stat"><span className="stat-label">Ranking</span><span className="stat-value">#{university.ranking}</span></div>
          )}
          <div className="stat"><span className="stat-label">Admission Rate</span><span className="stat-value">{university.admission_rate_display || 'N/A'}</span></div>
          <div className="stat"><span className="stat-label">Tuition/Year</span><span className="stat-value tuition">{formatCurrency(university.tuition_fee)}</span></div>
          {university.program_count !== undefined && (
            <div className="stat"><span className="stat-label">Programs</span><span className="stat-value">{university.program_count}</span></div>
          )}
        </div>

        <div className="card-badges-row">
          {university.scholarships_available && <div className="scholarship-badge">🎓 Scholarships</div>}
          {university.uniassist_required && <div className="uniassist-badge">📋 UniAssist</div>}
        </div>

        <div className={`deadline ${isDeadlinePassed(university.deadline) ? 'passed' : isDeadlineApproaching(university.deadline) ? 'approaching' : ''}`}>
          <span className="deadline-label">📅 {formatDate(university.deadline)}</span>
          <span className="deadline-countdown">
            {deadlineCountdown(university.deadline) && (
              <span className={`countdown-chip ${
                isDeadlinePassed(university.deadline) ? 'chip-closed'
                : (daysLeft(university.deadline) ?? 999) <= 7 ? 'chip-urgent'
                : isDeadlineApproaching(university.deadline) ? 'chip-soon'
                : 'chip-ok'
              }`}>
                {deadlineCountdown(university.deadline)}
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="university-card-footer">
        <span className="type-badge">{university.university_type}</span>
        <div className="card-actions">
          {isAdmin && <button className="btn-edit-card" onClick={(e) => handleEdit(e, university.id)} title="Edit">✏️</button>}
          {isAdmin && <button className="btn-delete-card" onClick={(e) => handleDelete(e, university.id)} title="Delete">🗑️</button>}
          <ApplyButton universityId={university.id} />
        </div>
      </div>
    </div>
  );

  // ── List row ─────────────────────────────────────────────────────────────────
  const renderListRow = (university: University) => (
    <div key={university.id} className="university-list-row" onClick={() => handleCardClick(university)}>
      <div className="row-logo">
        {university.logo
          ? <img src={university.logo} alt={university.name} />
          : <span className="logo-placeholder">{university.name.charAt(0)}</span>}
      </div>

      <div className="row-main">
        <div className="row-header">
          <h3>{university.name}</h3>
          <span className="type-badge">{university.university_type}</span>
        </div>
        <div className="row-location"><span className="location-icon">📍</span>{university.city}, {university.country}</div>
        <div className="row-details">
          {university.ranking && <span className="detail-item"><strong>#{university.ranking}</strong> Ranking</span>}
          <span className="detail-item">Admission: {university.admission_rate_display || 'N/A'}</span>
          <span className="detail-item tuition">{formatCurrency(university.tuition_fee)}/year</span>
          {university.program_count !== undefined && <span className="detail-item">{university.program_count} Programs</span>}
        </div>
      </div>

      <div className="row-badges">
        {university.scholarships_available && <div className="scholarship-badge">🎓 Scholarships</div>}
        {university.uniassist_required && <div className="uniassist-badge">📋 UniAssist</div>}
        <div className={`deadline ${isDeadlinePassed(university.deadline) ? 'passed' : isDeadlineApproaching(university.deadline) ? 'approaching' : ''}`}>
          <span className="deadline-label">📅 {formatDate(university.deadline)}</span>
          {deadlineCountdown(university.deadline) && (
            <span className={`countdown-chip ${
              isDeadlinePassed(university.deadline) ? 'chip-closed'
              : (daysLeft(university.deadline) ?? 999) <= 7 ? 'chip-urgent'
              : isDeadlineApproaching(university.deadline) ? 'chip-soon'
              : 'chip-ok'
            }`}>
              {deadlineCountdown(university.deadline)}
            </span>
          )}
        </div>
      </div>

      <div className="row-actions">
        {isAdmin && <button className="btn-edit-card" onClick={(e) => handleEdit(e, university.id)} title="Edit">✏️ Edit</button>}
        {isAdmin && <button className="btn-delete-card" onClick={(e) => handleDelete(e, university.id)} title="Delete">🗑️ Delete</button>}
        <ApplyButton universityId={university.id} />
      </div>
    </div>
  );

  // ── Excel / Spreadsheet view ─────────────────────────────────────────────────
  const renderExcelView = () => {
    const sortIndicator = (field: SortField | null) => {
      if (!field) return null;
      if (sortField !== field) return <span className="sort-icon-inactive">↕</span>;
      return <span className="sort-icon-active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
      <div className="excel-view-wrapper">
        <div className="excel-table-container">
          <table className="excel-table">
            <thead>
              <tr className="excel-header-row">
                <th className="excel-th excel-th-num">#</th>
                {EXCEL_COLS.map((col, i) => (
                  <th
                    key={i}
                    className={[
                      'excel-th',
                      i === 0 ? 'excel-sticky-col' : '',
                      col.sortable ? 'excel-sortable' : '',
                      col.key && sortField === col.key ? 'excel-sorted' : '',
                    ].filter(Boolean).join(' ')}
                    style={{ minWidth: col.width }}
                    onClick={() => col.sortable && col.key && handleSort(col.key)}
                  >
                    <div className="excel-th-inner">
                      {col.label}
                      {sortIndicator(col.key)}
                    </div>
                  </th>
                ))}
                <th className="excel-th" style={{ minWidth: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayUniversities.map((u, idx) => (
                <tr
                  key={u.id}
                  className={`excel-row ${hasAppliedTo(u.id) ? 'excel-row-applied' : ''}`}
                  onClick={() => handleCardClick(u)}
                >
                  {/* Row # */}
                  <td className="excel-td excel-td-num">{(currentPage - 1) * pageSize + idx + 1}</td>

                  {/* University name — sticky */}
                  <td className="excel-td excel-sticky-col excel-name-cell">
                    <div className="excel-uni-name">
                      <div className="excel-uni-initial">{u.name.charAt(0)}</div>
                      <span className="excel-uni-text">{u.name}</span>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="excel-td">
                    <div className="excel-location">
                      <span className="excel-city">{u.city}</span>
                      <span className="excel-country">{u.country}</span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="excel-td">
                    <span className="excel-type-badge">{u.university_type}</span>
                  </td>

                  {/* Rank */}
                  <td className="excel-td excel-td-center">
                    {u.ranking ? <span className="excel-rank">#{u.ranking}</span> : <span className="excel-nil">—</span>}
                  </td>

                  {/* Programs */}
                  <td className="excel-td excel-td-center">
                    {u.program_count !== undefined ? u.program_count : <span className="excel-nil">—</span>}
                  </td>

                  {/* Tuition */}
                  <td className="excel-td excel-td-right excel-tuition-cell">
                    {formatCurrency(u.tuition_fee)}
                  </td>

                  {/* App Fee */}
                  <td className="excel-td excel-td-right">
                    {u.application_fee ? formatCurrency(u.application_fee) : <span className="excel-nil">—</span>}
                  </td>

                  {/* Deadline */}
                  <td className={`excel-td excel-deadline-cell ${isDeadlinePassed(u.deadline) ? 'deadline-passed' : isDeadlineApproaching(u.deadline) ? 'deadline-approaching' : ''}`}>
                    <div className="excel-deadline-content">
                      <span>{formatDate(u.deadline)}</span>
                      {isDeadlineApproaching(u.deadline) && <span className="excel-urgent">!</span>}
                    </div>
                  </td>

                  {/* Acceptance */}
                  <td className="excel-td excel-td-center">
                    {u.admission_rate_display || <span className="excel-nil">—</span>}
                  </td>

                  {/* Scholarships */}
                  <td className="excel-td excel-td-center">
                    {u.scholarships_available ? <span className="excel-check-yes">✓</span> : <span className="excel-nil">—</span>}
                  </td>

                  {/* UniAssist */}
                  <td className="excel-td excel-td-center">
                    {u.uniassist_required ? <span className="excel-check-warn">✓</span> : <span className="excel-nil">—</span>}
                  </td>

                  {/* Actions */}
                  <td className="excel-td excel-actions-cell" onClick={e => e.stopPropagation()}>
                    <div className="excel-actions">
                      {isAdmin && (
                        <>
                          <button className="excel-btn-icon" onClick={(e) => handleEdit(e, u.id)} title="Edit">✏️</button>
                          <button className="excel-btn-icon excel-btn-del" onClick={(e) => handleDelete(e, u.id)} title="Delete">🗑️</button>
                        </>
                      )}
                      <ApplyButton universityId={u.id} small />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── Loading / error / detail states ─────────────────────────────────────────
  if (loading && universities.length === 0) {
    return (
      <div className="university-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading universities...</p>
      </div>
    );
  }

  if (error && universities.length === 0) {
    return (
      <div className="university-list-error">
        <p>{error}</p>
        <button onClick={loadUniversities} className="retry-button">Retry</button>
      </div>
    );
  }

  if (detailLoading) {
    return (
      <div className="university-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading university details...</p>
      </div>
    );
  }

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

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="university-list">
      <div className="university-list-header">
        <div className="header-left">
          <p className="eyebrow">University Directory</p>
          <h2>{isAdmin ? 'My Universities' : 'Find Your Dream University'}</h2>
        </div>
        {isAdmin && (
          <Link to="/universities/new" className="add-button">+ Add University</Link>
        )}
      </div>

      {/* Guest banner */}
      {!isAuthenticated && (
        <div className="guest-banner">
          <div className="guest-banner-left">
            <span className="guest-banner-icon">🎓</span>
            <div className="guest-banner-text">
              <strong>Sign up free</strong> to track applications, mark programs as applied, and get deadline reminders.
            </div>
          </div>
          <div className="guest-banner-actions">
            <Link to="/signup" className="guest-cta">Create Account</Link>
            <Link to="/login" className="guest-signin">Sign In</Link>
          </div>
        </div>
      )}

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
            <select value={selectedCountry} onChange={(e) => handleCountryChange(e.target.value)} className="filter-select">
              <option value="">All Countries</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select value={selectedType} onChange={(e) => handleTypeChange(e.target.value)} className="filter-select">
              <option value="">All Types</option>
              {universityTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select value={selectedUniAssist} onChange={(e) => setSelectedUniAssist(e.target.value)} className="filter-select">
              <option value="">UniAssist: All</option>
              <option value="yes">UniAssist: Required</option>
              <option value="no">UniAssist: Not required</option>
            </select>

            <label className="checkbox-label">
              <input type="checkbox" checked={showScholarshipsOnly} onChange={(e) => handleScholarshipsChange(e.target.checked)} />
              <span className="checkbox-custom"></span>
              Scholarships
            </label>
          </div>

          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid View">▦</button>
            <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List View">☰</button>
            <button className={`view-btn ${viewMode === 'excel' ? 'active' : ''}`} onClick={() => setViewMode('excel')} title="Spreadsheet View">⊞</button>
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <button className="clear-filters" onClick={clearFilters}>✕ Clear Filters</button>
      )}

      <div className="results-info">
        <span>Showing {displayUniversities.length} of {totalCount} universities</span>
        {viewMode === 'excel' && sortField && (
          <span className="sort-info">Sorted by {sortField.replace(/_/g, ' ')} {sortDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>

      {displayUniversities.length === 0 ? (
        <div className="university-list-empty">
          <div className="empty-icon">🏫</div>
          <p>No universities found.</p>
          {hasActiveFilters && <button className="clear-filters-btn" onClick={clearFilters}>Clear Filters</button>}
          {isAdmin && <Link to="/universities/new" className="add-button">Add University</Link>}
        </div>
      ) : viewMode === 'grid' ? (
        <>
          <div className="university-grid">{displayUniversities.map(renderGridCard)}</div>
          {renderPagination()}
        </>
      ) : viewMode === 'list' ? (
        <>
          <div className="university-list-view">{displayUniversities.map(renderListRow)}</div>
          {renderPagination()}
        </>
      ) : (
        <>
          {renderExcelView()}
          {renderPagination()}
        </>
      )}
    </div>
  );
};

export default UniversityList;
