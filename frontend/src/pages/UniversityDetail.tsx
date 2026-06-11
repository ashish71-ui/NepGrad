import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { University, Program, Application } from '../services/universityService';
import universityService from '../services/universityService';
import { useAuth } from '../context/AuthContext';
import './UniversityDetail.css';

interface UniversityDetailProps {
  university: University;
  isAdmin: boolean;
  hasApplied: boolean;
  onApplyChange: (universityId: number, applied: boolean) => void;
}

/* ── Icons ─────────────────────────────────────────────────────────────────── */
const IconBack    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IconPin     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconEdit    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconCheck   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconGrad    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>;
const IconInfo    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconDollar  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IconClipboard = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>;
const IconMail    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const IconPhone   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.25h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.95a16 16 0 0 0 6 6l1.06-.97a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IconGlobe   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconAlert   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconBook    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
const IconCalendar = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconLanguage = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>;
const IconChevron = ({ down }: { down: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: down ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IconSend = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;

/* ── Helpers ────────────────────────────────────────────────────────────────── */
const fmtCurrency = (n: number | null) =>
  n == null ? null
  : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtShort = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

const daysUntil = (d: string | null) =>
  d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;

const has = (v: string | null | undefined) => !!v && v.trim().length > 0;

/* ── Program detail card ───────────────────────────────────────────────────── */
const ProgramCard: React.FC<{ program: Program; expanded: boolean; onToggle: () => void }> = ({
  program: p, expanded, onToggle,
}) => {
  const fmtCurr = fmtCurrency;

  const degreeLabel: Record<string, string> = {
    masters: "Master's", bachelors: "Bachelor's", phd: 'PhD',
    diploma: 'Diploma', certificate: 'Certificate', other: 'Other',
  };

  const hasCosts    = has(p.semester_contribution) || has(p.costs_of_living) || has(p.additional_tuition_info) || p.tuition_fee;
  const hasFunding  = has(p.funding_available) || has(p.funding_description) || has(p.daad_funding_programme);
  const hasLangReq  = has(p.language_requirements) || has(p.languages_description);
  const hasAcadReq  = has(p.academic_requirements) || has(p.requirements);
  const hasApplyInfo = has(p.portal) || has(p.application_submission_info) || has(p.program_url);
  const hasLiving   = has(p.accommodation_info) || has(p.part_time_employment) || has(p.career_services);

  const hasDetails  = hasCosts || hasFunding || hasLangReq || hasAcadReq || hasApplyInfo || hasLiving;

  return (
    <div className={`program-card-v2 ${expanded ? 'expanded' : ''}`}>

      {/* ── Card header ── */}
      <div className="pc-header">
        <div className="pc-tags">
          {p.degree_type && <span className="pc-tag degree">{degreeLabel[p.degree_type] ?? p.degree_type}</span>}
          {has(p.teaching_language) && <span className="pc-tag lang">{p.teaching_language}</span>}
          {has(p.study_mode) && <span className="pc-tag mode">{p.study_mode}</span>}
        </div>
        <h3 className="pc-name">{p.name}</h3>

        <div className="pc-meta-row">
          {has(p.course_location) && (
            <span className="pc-meta-item"><IconPin/>{p.course_location}</span>
          )}
          {(has(p.duration_text) || p.duration_years) && (
            <span className="pc-meta-item">⏱ {p.duration_text || `${p.duration_years} yr`}</span>
          )}
          {has(p.beginning) && (
            <span className="pc-meta-item"><IconCalendar/>{p.beginning}</span>
          )}
        </div>
      </div>

      {/* ── Deadline strip ── */}
      {(has(p.application_deadline) || has(p.application_deadline_2)) && (
        <div className="pc-deadline-strip">
          <IconCalendar/>
          <div className="pc-deadline-body">
            <span className="pc-deadline-label">Application Deadline</span>
            {has(p.application_deadline) && (
              <p className="pc-deadline-text">{p.application_deadline}</p>
            )}
            {has(p.application_deadline_2) && (
              <p className="pc-deadline-text secondary">{p.application_deadline_2}</p>
            )}
          </div>
          {has(p.program_url) && (
            <a
              href={p.program_url.startsWith('http') ? p.program_url : `https://${p.program_url}`}
              target="_blank" rel="noopener noreferrer"
              className="pc-website-link"
              onClick={e => e.stopPropagation()}
            >
              Course page →
            </a>
          )}
        </div>
      )}

      {/* ── Description ── */}
      {has(p.description) && !expanded && (
        <div className="pc-description-preview">
          {p.description.length > 200 ? p.description.slice(0, 200) + '…' : p.description}
        </div>
      )}

      {/* ── Expandable details ── */}
      {expanded && (
        <div className="pc-details">

          {has(p.description) && (
            <div className="pc-detail-section">
              <h4>About this Programme</h4>
              <p>{p.description}</p>
            </div>
          )}

          {hasLangReq && (
            <div className="pc-detail-section">
              <h4><IconLanguage/> Language Requirements</h4>
              {has(p.language_requirements) && <p>{p.language_requirements}</p>}
              {has(p.languages_description) && <p className="secondary">{p.languages_description}</p>}
            </div>
          )}

          {hasAcadReq && (
            <div className="pc-detail-section">
              <h4><IconClipboard/> Academic Admission Requirements</h4>
              {has(p.academic_requirements) && <p>{p.academic_requirements}</p>}
              {has(p.requirements) && !has(p.academic_requirements) && <p>{p.requirements}</p>}
            </div>
          )}

          {hasCosts && (
            <div className="pc-detail-section">
              <h4><IconDollar/> Costs</h4>
              <div className="pc-cost-grid">
                {p.tuition_fee && (
                  <div className="pc-cost-item">
                    <span className="pc-cost-label">Tuition Fee</span>
                    <span className="pc-cost-value">{fmtCurr(p.tuition_fee)}</span>
                  </div>
                )}
                {has(p.semester_contribution) && (
                  <div className="pc-cost-item">
                    <span className="pc-cost-label">Semester Contribution</span>
                    <span className="pc-cost-value">{p.semester_contribution}</span>
                  </div>
                )}
                {has(p.costs_of_living) && (
                  <div className="pc-cost-item">
                    <span className="pc-cost-label">Cost of Living</span>
                    <span className="pc-cost-value">{p.costs_of_living}</span>
                  </div>
                )}
              </div>
              {has(p.additional_tuition_info) && <p className="secondary mt-8">{p.additional_tuition_info}</p>}
            </div>
          )}

          {hasFunding && (
            <div className="pc-detail-section">
              <h4><IconGrad/> Funding Opportunities</h4>
              {has(p.daad_funding_programme) && (
                <p className="pc-funding-badge">DAAD: {p.daad_funding_programme}</p>
              )}
              {has(p.funding_description) && <p>{p.funding_description}</p>}
              {!has(p.funding_description) && p.funding_available === 'Yes' && (
                <p>Funding opportunities are available at this university.</p>
              )}
            </div>
          )}

          {hasApplyInfo && (
            <div className="pc-detail-section">
              <h4><IconSend/> How to Apply</h4>
              {has(p.application_submission_info) && <p>{p.application_submission_info}</p>}
              {has(p.portal) && (
                <a href={p.portal.startsWith('http') ? p.portal : '#'}
                  target="_blank" rel="noopener noreferrer" className="pc-apply-link">
                  Open Application Portal →
                </a>
              )}
            </div>
          )}

          {hasLiving && (
            <div className="pc-detail-section">
              <h4><IconPin/> Living & Support</h4>
              {has(p.accommodation_info) && (
                <div className="pc-detail-subsection">
                  <span className="pc-sub-label">Accommodation</span>
                  <p>{p.accommodation_info}</p>
                </div>
              )}
              {has(p.part_time_employment) && (
                <div className="pc-detail-subsection">
                  <span className="pc-sub-label">Part-time Employment</span>
                  <p>{p.part_time_employment}</p>
                </div>
              )}
              {has(p.career_services) && (
                <div className="pc-detail-subsection">
                  <span className="pc-sub-label">Career Services</span>
                  <p>{p.career_services}</p>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── Toggle ── */}
      {hasDetails && (
        <button className="pc-toggle" onClick={onToggle}>
          <IconChevron down={expanded}/>
          {expanded ? 'Show less' : 'View requirements, costs & more'}
        </button>
      )}
    </div>
  );
};

/* ── Main component ─────────────────────────────────────────────────────────── */
const UniversityDetail: React.FC<UniversityDetailProps> = ({
  university, isAdmin, hasApplied, onApplyChange,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [applying, setApplying] = useState(false);
  const [expandedPrograms, setExpandedPrograms] = useState<Set<number>>(new Set());

  const toggleProgram = (id: number) =>
    setExpandedPrograms(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const days = daysUntil(university.deadline);
  const deadlineState: 'passed' | 'urgent' | 'approaching' | 'normal' =
    days === null ? 'normal'
    : days < 0   ? 'passed'
    : days <= 7  ? 'urgent'
    : days <= 30 ? 'approaching'
    : 'normal';

  const deadlineLabel = {
    passed:     'Deadline has passed',
    urgent:     `${days} days remaining — act now`,
    approaching:`${days} days remaining`,
    normal:     university.deadline ? `${days} days away` : 'No deadline set',
  }[deadlineState];

  const handleApply = async () => {
    if (hasApplied) {
      try {
        const apps = await universityService.getMyApplications();
        const app = apps.find((a: Application) => a.university === university.id);
        if (app) { await universityService.withdrawApplication(app.id); onApplyChange(university.id, false); }
      } catch (err) { console.error(err); }
      return;
    }
    try {
      setApplying(true);
      await universityService.applyToUniversity(university.id);
      onApplyChange(university.id, true);
    } catch (err) {
      console.error(err);
      alert('Failed to apply. You may have already applied.');
    } finally { setApplying(false); }
  };

  const hasContact = university.email || university.phone || university.website;
  const hasReqs    = university.ielts_score || university.toefl_score || university.gre_score || university.gmat_score;

  return (
    <div className="university-detail">

      {/* Back nav */}
      <div className="detail-back-nav">
        <button className="btn-back" onClick={() => navigate('/universities')}>
          <IconBack/> Back to Universities
        </button>
      </div>

      {/* ── Hero ── */}
      <div className="detail-hero">
        <div className="hero-top">
          <div className="hero-logo">
            {university.logo
              ? <img src={university.logo} alt={university.name}/>
              : <span className="logo-placeholder">{university.name.charAt(0)}</span>}
          </div>
          <div className="hero-identity">
            <div className="hero-tags">
              <span className="hero-badge">{university.university_type_display || university.university_type}</span>
              {university.scholarships_available && <span className="hero-badge">🎓 Scholarships</span>}
              {university.uniassist_required     && <span className="hero-badge" style={{ background:'rgba(124,106,158,0.4)', color:'#e8dff5' }}>📋 UniAssist Required</span>}
              {hasApplied && <span className="hero-badge applied-hero">✓ Applied</span>}
            </div>
            <h1>{university.name}</h1>
            <p className="hero-location">
              <IconPin/>
              {university.city}, {university.country}
              {university.address && <span style={{ opacity:0.6 }}> · {university.address}</span>}
            </p>
          </div>
        </div>

        <div className="hero-kpis">
          <div className="kpi">
            <span className="kpi-label">World Ranking</span>
            <span className="kpi-value">{university.ranking ? `#${university.ranking}` : '—'}</span>
            <span className="kpi-sub">Global position</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Acceptance Rate</span>
            <span className="kpi-value">{university.admission_rate_display || '—'}</span>
            <span className="kpi-sub">Admitted applicants</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Tuition / Year</span>
            <span className="kpi-value">{fmtCurrency(university.tuition_fee) ?? '—'}</span>
            <span className="kpi-sub">Annual tuition</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Programmes</span>
            <span className="kpi-value">{university.program_count ?? (university.programs?.length ?? '—')}</span>
            <span className="kpi-sub">Available courses</span>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="detail-actions">
        {isAuthenticated ? (
          <button
            onClick={handleApply}
            className={`btn-apply ${hasApplied ? 'applied' : ''} ${applying ? 'applying' : ''}`}
            disabled={hasApplied || applying}
          >
            {hasApplied ? <><IconCheck/> Applied</> : applying ? 'Applying…' : <><IconGrad/> Apply Now</>}
          </button>
        ) : (
          <button className="btn-apply btn-apply-guest" onClick={() => navigate('/login')}>
            <IconGrad/> Sign In to Apply
          </button>
        )}

        {isAdmin && (
          <button className="btn-edit" onClick={() => { window.location.href = `/universities/${university.id}/edit`; }}>
            <IconEdit/> Edit University
          </button>
        )}

        {(deadlineState === 'urgent' || deadlineState === 'approaching') && !hasApplied && (
          <span className="deadline-warning"><IconAlert/> {deadlineLabel}</span>
        )}
      </div>

      {/* ── At a glance strip ── */}
      {(hasReqs || university.uniassist_required || university.scholarships_available || deadlineState !== 'normal') && (
        <div className="glance-strip">
          {deadlineState !== 'normal' && (
            <div className={`glance-item glance-deadline glance-${deadlineState}`}>
              <span className="glance-icon"><IconCalendar/></span>
              <div className="glance-body">
                <span className="glance-label">Deadline</span>
                <span className="glance-value">{fmtShort(university.deadline) ?? 'Not set'}</span>
                <span className="glance-sub">{deadlineLabel}</span>
              </div>
            </div>
          )}
          {university.ielts_score != null && (
            <div className="glance-item">
              <span className="glance-icon">🗣</span>
              <div className="glance-body">
                <span className="glance-label">IELTS</span>
                <span className="glance-value">{university.ielts_score}+</span>
                <span className="glance-sub">Min. band</span>
              </div>
            </div>
          )}
          {university.toefl_score != null && (
            <div className="glance-item">
              <span className="glance-icon">🗣</span>
              <div className="glance-body">
                <span className="glance-label">TOEFL</span>
                <span className="glance-value">{university.toefl_score}+</span>
                <span className="glance-sub">Min. iBT</span>
              </div>
            </div>
          )}
          {university.gre_score != null && (
            <div className="glance-item">
              <span className="glance-icon">📝</span>
              <div className="glance-body">
                <span className="glance-label">GRE</span>
                <span className="glance-value">{university.gre_score}+</span>
                <span className="glance-sub">Min. total</span>
              </div>
            </div>
          )}
          {university.gmat_score != null && (
            <div className="glance-item">
              <span className="glance-icon">📝</span>
              <div className="glance-body">
                <span className="glance-label">GMAT</span>
                <span className="glance-value">{university.gmat_score}+</span>
                <span className="glance-sub">Min. total</span>
              </div>
            </div>
          )}
          {university.uniassist_required && (
            <div className="glance-item glance-warn">
              <span className="glance-icon">📋</span>
              <div className="glance-body">
                <span className="glance-label">UniAssist</span>
                <span className="glance-value">Required</span>
                <span className="glance-sub">Extra step needed</span>
              </div>
            </div>
          )}
          {university.scholarships_available && (
            <div className="glance-item glance-success">
              <span className="glance-icon">🎓</span>
              <div className="glance-body">
                <span className="glance-label">Scholarships</span>
                <span className="glance-value">Available</span>
                <span className="glance-sub">Funding options</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Body Grid ── */}
      <div className="detail-body">

        {/* ══ MAIN COLUMN ══ */}
        <div className="detail-main">

          {/* 1. PROGRAMMES — most critical: what are you applying for */}
          {university.programs && university.programs.length > 0 && (
            <div className="section-card">
              <div className="section-head">
                <IconBook/>
                <h2>Programmes Offered</h2>
                <span className="section-head-count">{university.programs.length}</span>
              </div>
              <div className="section-body no-pad">
                {university.programs.map(p => (
                  <ProgramCard
                    key={p.id}
                    program={p}
                    expanded={expandedPrograms.has(p.id)}
                    onToggle={() => toggleProgram(p.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 2. ADMISSION REQUIREMENTS — test scores */}
          {hasReqs && (
            <div className="section-card">
              <div className="section-head">
                <IconClipboard/><h2>Admission Requirements</h2>
              </div>
              <div className="section-body">
                <div className="req-grid">
                  {university.ielts_score != null && (
                    <div className="req-item">
                      <span className="req-label">IELTS</span>
                      <span className="req-value">{university.ielts_score}</span>
                      <span className="req-desc">Minimum band score</span>
                    </div>
                  )}
                  {university.toefl_score != null && (
                    <div className="req-item">
                      <span className="req-label">TOEFL</span>
                      <span className="req-value">{university.toefl_score}</span>
                      <span className="req-desc">Minimum iBT score</span>
                    </div>
                  )}
                  {university.gre_score != null && (
                    <div className="req-item">
                      <span className="req-label">GRE</span>
                      <span className="req-value">{university.gre_score}</span>
                      <span className="req-desc">Minimum total score</span>
                    </div>
                  )}
                  {university.gmat_score != null && (
                    <div className="req-item">
                      <span className="req-label">GMAT</span>
                      <span className="req-value">{university.gmat_score}</span>
                      <span className="req-desc">Minimum total score</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. FINANCIAL — costs at university level */}
          {(university.tuition_fee != null || university.application_fee != null) && (
            <div className="section-card">
              <div className="section-head">
                <IconDollar/><h2>Financial Information</h2>
              </div>
              <div className="section-body">
                <div className="info-grid">
                  {university.tuition_fee != null && (
                    <div className="info-row">
                      <span className="info-label">Tuition (per year)</span>
                      <span className="info-value">{fmtCurrency(university.tuition_fee)}</span>
                    </div>
                  )}
                  {university.application_fee != null && (
                    <div className="info-row">
                      <span className="info-label">Application Fee</span>
                      <span className="info-value">{fmtCurrency(university.application_fee)}</span>
                    </div>
                  )}
                  {university.admission_rate != null && (
                    <div className="info-row">
                      <span className="info-label">Acceptance Rate</span>
                      <span className="info-value">{university.admission_rate_display}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. SCHOLARSHIPS */}
          {university.scholarships_available && (
            <div className="scholarship-banner">
              <div className="scholarship-icon">🎓</div>
              <div className="scholarship-text">
                <h3>Scholarships Available</h3>
                <p>{university.scholarships_description || 'This university offers scholarships for eligible students. Contact the admissions office for details.'}</p>
              </div>
            </div>
          )}

          {/* 5. ABOUT */}
          {university.description && (
            <div className="section-card">
              <div className="section-head"><IconInfo/><h2>About</h2></div>
              <div className="section-body">
                <p className="about-text">{university.description}</p>
              </div>
            </div>
          )}

          {/* 6. REMARKS */}
          {university.remark && (
            <div className="section-card">
              <div className="section-head"><IconInfo/><h2>Additional Remarks</h2></div>
              <div className="section-body">
                <p className="about-text">{university.remark}</p>
              </div>
            </div>
          )}

        </div>{/* /detail-main */}

        {/* ══ SIDEBAR ══ */}
        <div className="detail-sidebar">

          {/* Deadline */}
          <div className="deadline-card">
            <div className="deadline-top">
              <span className="deadline-card-label">Application Deadline</span>
              <span className={`deadline-card-date ${deadlineState}`}>
                {fmtShort(university.deadline) ?? 'Not set'}
              </span>
            </div>
            <div className={`deadline-bottom ${deadlineState === 'normal' ? '' : deadlineState}`}>
              {deadlineLabel}
            </div>
          </div>

          {/* University stats */}
          <div className="section-card">
            <div className="section-head"><IconInfo/><h2>University Info</h2></div>
            <div className="section-body">
              <div className="sidebar-stat">
                {university.ranking != null && (
                  <div className="sidebar-stat-row">
                    <span className="ss-label">World Ranking</span>
                    <span className="ss-value">#{university.ranking}</span>
                  </div>
                )}
                <div className="sidebar-stat-row">
                  <span className="ss-label">Type</span>
                  <span className="ss-value">{university.university_type_display || university.university_type}</span>
                </div>
                {university.admission_rate != null && (
                  <div className="sidebar-stat-row">
                    <span className="ss-label">Acceptance Rate</span>
                    <span className="ss-value">{university.admission_rate_display}</span>
                  </div>
                )}
                {university.founded_year && (
                  <div className="sidebar-stat-row">
                    <span className="ss-label">Founded</span>
                    <span className="ss-value">{university.founded_year}</span>
                  </div>
                )}
                {university.tuition_fee != null && (
                  <div className="sidebar-stat-row">
                    <span className="ss-label">Tuition / yr</span>
                    <span className="ss-value highlight-green">{fmtCurrency(university.tuition_fee)}</span>
                  </div>
                )}
                {university.application_fee != null && (
                  <div className="sidebar-stat-row">
                    <span className="ss-label">Application Fee</span>
                    <span className="ss-value">{fmtCurrency(university.application_fee)}</span>
                  </div>
                )}
                <div className="sidebar-stat-row">
                  <span className="ss-label">Scholarships</span>
                  <span className="ss-value" style={{ color: university.scholarships_available ? 'var(--status-success)' : 'var(--text-placeholder)' }}>
                    {university.scholarships_available ? 'Available' : 'Not listed'}
                  </span>
                </div>
                <div className="sidebar-stat-row">
                  <span className="ss-label">UniAssist</span>
                  <span className="ss-value" style={{ color: university.uniassist_required ? 'var(--status-warning)' : 'var(--text-placeholder)' }}>
                    {university.uniassist_required ? 'Required' : 'Not required'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="section-card">
            <div className="section-head"><IconPin/><h2>Location</h2></div>
            <div className="section-body">
              <div className="sidebar-stat">
                <div className="sidebar-stat-row">
                  <span className="ss-label">Country</span>
                  <span className="ss-value">{university.country}</span>
                </div>
                <div className="sidebar-stat-row">
                  <span className="ss-label">City</span>
                  <span className="ss-value">{university.city}</span>
                </div>
                {university.address && (
                  <div className="sidebar-stat-row">
                    <span className="ss-label">Address</span>
                    <span className="ss-value" style={{ fontSize:'12px', textAlign:'right', maxWidth:'160px' }}>{university.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact */}
          {hasContact && (
            <div className="section-card">
              <div className="section-head"><IconMail/><h2>Contact</h2></div>
              <div className="section-body">
                {university.email && (
                  <div className="contact-item">
                    <div className="contact-icon"><IconMail/></div>
                    <div className="contact-meta">
                      <div className="contact-type">Email</div>
                      <a href={`mailto:${university.email}`} className="contact-link">{university.email}</a>
                    </div>
                  </div>
                )}
                {university.phone && (
                  <div className="contact-item">
                    <div className="contact-icon"><IconPhone/></div>
                    <div className="contact-meta">
                      <div className="contact-type">Phone</div>
                      <span className="contact-val">{university.phone}</span>
                    </div>
                  </div>
                )}
                {university.website && (
                  <div className="contact-item">
                    <div className="contact-icon"><IconGlobe/></div>
                    <div className="contact-meta">
                      <div className="contact-type">Website</div>
                      <a href={university.website} target="_blank" rel="noopener noreferrer" className="contact-link">
                        Visit website →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>{/* /detail-sidebar */}
      </div>
    </div>
  );
};

export default UniversityDetail;
