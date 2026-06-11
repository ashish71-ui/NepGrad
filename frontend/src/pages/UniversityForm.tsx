import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import universityService, { type University, type ExcelUploadResult } from '../services/universityService';
import './UniversityForm.css';

interface UniversityFormProps {
  isEditing?: boolean;
}

type Mode = 'manual' | 'excel';

const UniversityForm: React.FC<UniversityFormProps> = ({ isEditing = false }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // ── mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('manual');

  // ── manual form state ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<University>>({
    name: '',
    description: '',
    website: '',
    country: '',
    city: '',
    address: '',
    deadline: '',
    application_fee: null,
    tuition_fee: null,
    admission_rate: null,
    founded_year: null,
    university_type: 'Public',
    ranking: null,
    ielts_score: null,
    toefl_score: null,
    gre_score: null,
    gmat_score: null,
    scholarships_available: false,
    scholarships_description: '',
    uniassist_required: false,
    remark: '',
    email: '',
    phone: '',
  });

  // ── excel upload state ────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [defaultCountry, setDefaultCountry] = useState('Germany');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ExcelUploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (isEditing && id) loadUniversity(parseInt(id));
  }, [isEditing, id]);

  const loadUniversity = async (universityId: number) => {
    try {
      setLoading(true);
      const data = await universityService.getUniversity(universityId);
      setFormData(data);
    } catch {
      setError('Failed to load university data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked
             : type === 'number' ? (value ? parseFloat(value) : null)
             : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      if (isEditing && id) {
        await universityService.updateUniversity(parseInt(id), formData);
      } else {
        await universityService.createUniversity(formData);
      }
      navigate('/universities');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save university. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── excel template download ───────────────────────────────────────────────
  const [downloading, setDownloading] = useState(false);
  const [showColumnRef, setShowColumnRef] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      setDownloading(true);
      await universityService.downloadTemplate();
    } catch {
      alert('Could not download template. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Column reference data — mirrors the backend EXCEL_COLUMN_MAP
  const COLUMN_GROUPS: { group: string; icon: string; columns: Array<{ name: string; required?: boolean; hint?: string }> }[] = [
    {
      group: 'Required', icon: '★',
      columns: [
        { name: 'University',            required: true, hint: 'Full official university name' },
        { name: 'Degree',                required: true, hint: '"Master of Science", "Bachelor of Arts", "PhD" …' },
        { name: 'course',                required: true, hint: 'Full programme name' },
        { name: 'Application deadline',  required: true, hint: 'DD.MM.YYYY — primary deadline' },
      ],
    },
    {
      group: 'Programme Info', icon: '📋',
      columns: [
        { name: 'application deadline 2', hint: 'Second/rolling deadline' },
        { name: 'URL',                    hint: 'Direct link to the programme page' },
        { name: 'portal',                 hint: 'Online application portal URL' },
        { name: 'Submit application to',  hint: 'How / where to submit' },
        { name: 'Course location',        hint: 'City or campus' },
        { name: 'Teaching language',      hint: 'e.g. English' },
        { name: 'Languages',              hint: 'Detailed language requirements' },
        { name: 'Programme duration',     hint: 'e.g. 2 years (4 semesters)' },
        { name: 'Beginning',              hint: 'e.g. Winter semester (October)' },
        { name: 'Description/content',   hint: 'Programme overview text' },
        { name: 'Course organisation',   hint: 'Structure of the course' },
        { name: 'Full-time / part-time', hint: '"Full-time" or "Part-time"' },
        { name: 'Mode of study',         hint: 'Full-time / Part-time / Distance' },
        { name: 'Pace of course',        hint: 'Course intensity description' },
        { name: 'reason',                hint: 'Why this programme is notable' },
      ],
    },
    {
      group: 'Costs & Funding', icon: '💰',
      columns: [
        { name: 'Semester contribution',  hint: 'Mandatory fees per semester' },
        { name: 'Costs of living',        hint: 'Estimated monthly costs' },
        { name: 'Funding opportunities within the university', hint: 'Yes / No' },
        { name: 'Description of the above-mentioned funding opportunities within the university', hint: 'Funding details' },
        { name: 'Name of DAAD funding programme', hint: 'Specific DAAD programme name' },
        { name: 'Special promotion / funding of the programme', hint: 'Special grants or excellence funds' },
        { name: 'Additional information on tuition fees', hint: 'Extra fee details' },
      ],
    },
    {
      group: 'Admission Requirements', icon: '📝',
      columns: [
        { name: 'Academic admission requirements', hint: 'Academic prerequisites' },
        { name: 'Language requirements',            hint: 'e.g. IELTS 6.5 or TOEFL 88' },
      ],
    },
    {
      group: 'Support & Living', icon: '🏠',
      columns: [
        { name: 'Accommodation',                    hint: 'Housing options' },
        { name: 'Possibility of finding part-time employment', hint: 'Work rules' },
        { name: 'Career advisory services and programmes for future professionals', hint: 'Career support' },
        { name: 'Support for international students and doctoral candidates', hint: 'Intl. student support' },
        { name: 'General services and support for international students and doctoral candidates', hint: 'Other services' },
        { name: 'Supervisor-student ratio',         hint: 'e.g. 1:20' },
      ],
    },
    {
      group: 'International & Other', icon: '🌍',
      columns: [
        { name: 'International elements',           hint: 'International aspects' },
        { name: 'Integrated internships',           hint: 'Internship info' },
        { name: 'Integrated/optional study abroad unit(s)', hint: 'Study abroad options' },
        { name: 'Course-specific, integrated German language courses', hint: 'Yes / No' },
        { name: 'Course-specific, integrated English language courses', hint: 'Yes / No' },
        { name: 'Diverse intercultural background of students', hint: 'Student diversity' },
        { name: 'In cooperation with',              hint: 'Partner institutions' },
        { name: 'Phase(s) of attendance in Germany (applies to the entire programme)', hint: 'Time on-campus in Germany' },
        { name: 'Technical equipment and programmes', hint: 'IT / lab resources' },
        { name: 'Certificates for specific modules are awarded', hint: 'Yes / No' },
        { name: 'Description of other international elements', hint: 'Other intl. info' },
        { name: 'Current information',              hint: 'Latest news about the programme' },
        { name: 'Integrated/optional study abroad unit(s)', hint: 'Study abroad options' },
        { name: 'Additional information on beginning, duration and mode of study', hint: 'Extra study info' },
      ],
    },
  ];

  // ── excel handlers ────────────────────────────────────────────────────────
  const handleFileSelect = (file: File) => {
    const valid = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    if (!valid) {
      setUploadError('Only .xlsx or .xls files are supported.');
      return;
    }
    setExcelFile(file);
    setUploadResult(null);
    setUploadError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleExcelUpload = async () => {
    if (!excelFile) return;
    try {
      setUploading(true);
      setUploadError(null);
      setUploadResult(null);
      setShowErrors(false);
      const result = await universityService.uploadExcel(excelFile, defaultCountry);
      setUploadResult(result);
    } catch (err: any) {
      setUploadError(
        err.response?.data?.error ||
        err.response?.data?.file?.[0] ||
        'Upload failed. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  // ── loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="university-form-container">
        <div className="university-form-loading">
          <div className="loading-spinner"></div>
          <p>Loading university data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="university-form-container">
      <div className="university-form-header">
        <Link to="/universities" className="back-link">← Back to Universities</Link>
        <h1>{isEditing ? 'Edit University' : 'Add New University'}</h1>
        <p className="form-subtitle">
          {isEditing
            ? 'Update the university details below'
            : 'Fill in the details manually or bulk-import from an Excel file'}
        </p>
      </div>

      {/* Mode tabs — only shown when creating */}
      {!isEditing && (
        <div className="mode-tabs">
          <button
            type="button"
            className={`mode-tab ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            <span className="mode-tab-icon">✏️</span>
            Manual Entry
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === 'excel' ? 'active' : ''}`}
            onClick={() => setMode('excel')}
          >
            <span className="mode-tab-icon">📊</span>
            Upload Excel
          </button>
        </div>
      )}

      {/* ── Excel upload panel ────────────────────────────────────────────── */}
      {mode === 'excel' && !isEditing && (
        <div className="excel-upload-section">
          <div className="form-section">
            <h2>Import from Excel</h2>
            <p className="excel-hint">
              Upload a DAAD-formatted <code>.xlsx</code> file. Each row becomes a program linked
              to the university named in the <strong>University</strong> column. Universities are
              created automatically if they don't exist.
            </p>

            {/* ── Template guidance card ── */}
            <div className="template-card">
              <div className="template-steps">
                <div className="template-step template-step--active">
                  <div className="template-step-num">1</div>
                  <div className="template-step-content">
                    <div className="template-step-title">Download Template</div>
                    <div className="template-step-desc">Get the pre-formatted .xlsx with all required columns</div>
                    <button
                      type="button"
                      className="btn-download-template"
                      onClick={handleDownloadTemplate}
                      disabled={downloading}
                    >
                      {downloading
                        ? <><span className="btn-dl-spinner" /> Preparing…</>
                        : <>⬇ Download Template (.xlsx)</>}
                    </button>
                  </div>
                </div>
                <div className="template-step-arrow">→</div>
                <div className="template-step">
                  <div className="template-step-num">2</div>
                  <div className="template-step-content">
                    <div className="template-step-title">Fill in your data</div>
                    <div className="template-step-desc">Add programmes following the column format in the template</div>
                  </div>
                </div>
                <div className="template-step-arrow">→</div>
                <div className="template-step">
                  <div className="template-step-num">3</div>
                  <div className="template-step-content">
                    <div className="template-step-title">Upload below</div>
                    <div className="template-step-desc">Drag & drop or click to select your completed file</div>
                  </div>
                </div>
              </div>

              <div className="template-col-ref">
                <button
                  type="button"
                  className="template-col-toggle"
                  onClick={() => setShowColumnRef(v => !v)}
                >
                  <span className="template-col-toggle-icon">{showColumnRef ? '▲' : '▼'}</span>
                  {showColumnRef ? 'Hide' : 'View all'}{' '}
                  {COLUMN_GROUPS.reduce((acc, g) => acc + g.columns.length, 0)} columns reference
                </button>
                {showColumnRef && (
                  <div className="template-col-groups">
                    {COLUMN_GROUPS.map(group => (
                      <div key={group.group} className="template-col-group">
                        <div className="template-col-group-header">
                          <span className="template-col-group-icon">{group.icon}</span>
                          {group.group}
                        </div>
                        <div className="template-col-list">
                          {group.columns.map((col, i) => (
                            <div key={`${col.name}-${i}`} className={`template-col-item${col.required ? ' col-required' : ''}`}>
                              <div className="col-name-row">
                                {col.required && <span className="col-required-badge">Required</span>}
                                <code className="col-name-code">{col.name}</code>
                              </div>
                              {col.hint && <div className="col-hint">{col.hint}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Drop zone */}
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''} ${excelFile ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              {excelFile ? (
                <div className="drop-zone-file">
                  <span className="file-icon">📄</span>
                  <span className="file-name">{excelFile.name}</span>
                  <button
                    type="button"
                    className="file-remove"
                    onClick={e => { e.stopPropagation(); setExcelFile(null); setUploadResult(null); }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="drop-zone-placeholder">
                  <span className="drop-icon">📂</span>
                  <p className="drop-primary">Drop your Excel file here</p>
                  <p className="drop-secondary">or click to browse — .xlsx / .xls</p>
                </div>
              )}
            </div>

            {/* Country field */}
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label htmlFor="default_country">Default Country for new universities</label>
              <input
                type="text"
                id="default_country"
                value={defaultCountry}
                onChange={e => setDefaultCountry(e.target.value)}
                placeholder="e.g., Germany"
              />
            </div>

            {uploadError && <div className="form-error" style={{ marginTop: '12px' }}>{uploadError}</div>}

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate('/universities')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-submit"
                disabled={!excelFile || uploading}
                onClick={handleExcelUpload}
              >
                {uploading ? 'Uploading…' : 'Upload & Import'}
              </button>
            </div>
          </div>

          {/* Upload result */}
          {uploadResult && (
            <div className="upload-result">
              <h3 className="upload-result-title">
                Import complete
              </h3>
              <div className="upload-result-grid">
                <div className="upload-stat upload-stat--created">
                  <span className="upload-stat-number">{uploadResult.created}</span>
                  <span className="upload-stat-label">Created</span>
                </div>
                <div className="upload-stat upload-stat--updated">
                  <span className="upload-stat-number">{uploadResult.updated}</span>
                  <span className="upload-stat-label">Updated</span>
                </div>
                <div className="upload-stat upload-stat--skipped">
                  <span className="upload-stat-number">{uploadResult.skipped}</span>
                  <span className="upload-stat-label">Skipped</span>
                </div>
                <div className="upload-stat upload-stat--errors">
                  <span className="upload-stat-number">{uploadResult.errors.length}</span>
                  <span className="upload-stat-label">Errors</span>
                </div>
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="upload-errors">
                  <button
                    type="button"
                    className="upload-errors-toggle"
                    onClick={() => setShowErrors(v => !v)}
                  >
                    {showErrors ? '▲ Hide row errors' : `▼ Show ${uploadResult.errors.length} row error(s)`}
                  </button>
                  {showErrors && (
                    <ul className="upload-errors-list">
                      {uploadResult.errors.map(e => (
                        <li key={e.row}>
                          <strong>Row {e.row}:</strong> {e.error}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="upload-result-actions">
                <button
                  type="button"
                  className="btn-submit"
                  onClick={() => navigate('/universities')}
                >
                  View Universities
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Manual entry form ─────────────────────────────────────────────── */}
      {(mode === 'manual' || isEditing) && (
        <>
          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit} className="university-form">
            <div className="form-section">
              <h2>Basic Information</h2>

              <div className="form-group">
                <label htmlFor="name">University Name *</label>
                <input type="text" id="name" name="name" value={formData.name || ''} onChange={handleChange} required placeholder="e.g., Tribhuvan University" />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} rows={4} placeholder="Describe the university..." />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="university_type">University Type *</label>
                  <select id="university_type" name="university_type" value={formData.university_type || 'Public'} onChange={handleChange} required>
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                    <option value="Government">Government</option>
                    <option value="International">International</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="founded_year">Founded Year</label>
                  <input type="number" id="founded_year" name="founded_year" value={formData.founded_year || ''} onChange={handleChange} min="1800" max="2030" placeholder="e.g., 1959" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="website">Website</label>
                  <input type="url" id="website" name="website" value={formData.website || ''} onChange={handleChange} placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label htmlFor="ranking">World Ranking</label>
                  <input type="number" id="ranking" name="ranking" value={formData.ranking || ''} onChange={handleChange} min="1" placeholder="e.g., 1200" />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Location</h2>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="country">Country *</label>
                  <input type="text" id="country" name="country" value={formData.country || ''} onChange={handleChange} required placeholder="e.g., Nepal" />
                </div>
                <div className="form-group">
                  <label htmlFor="city">City *</label>
                  <input type="text" id="city" name="city" value={formData.city || ''} onChange={handleChange} required placeholder="e.g., Kathmandu" />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input type="text" id="address" name="address" value={formData.address || ''} onChange={handleChange} placeholder="Full address" />
              </div>
            </div>

            <div className="form-section">
              <h2>Contact Information</h2>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" value={formData.email || ''} onChange={handleChange} placeholder="admissions@university.edu" />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone</label>
                  <input type="tel" id="phone" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="+977-1-1234567" />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Admission Details</h2>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="application_fee">Application Fee (USD)</label>
                  <input type="number" id="application_fee" name="application_fee" value={formData.application_fee ?? ''} onChange={handleChange} min="0" placeholder="e.g., 50" />
                </div>
                <div className="form-group">
                  <label htmlFor="tuition_fee">Tuition Fee (USD/year)</label>
                  <input type="number" id="tuition_fee" name="tuition_fee" value={formData.tuition_fee ?? ''} onChange={handleChange} min="0" placeholder="e.g., 5000" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="admission_rate">Admission Rate (%)</label>
                  <input type="number" id="admission_rate" name="admission_rate" value={formData.admission_rate ?? ''} onChange={handleChange} min="0" max="100" placeholder="e.g., 75" />
                </div>
                <div className="form-group">
                  <label htmlFor="deadline">Application Deadline</label>
                  <input type="date" id="deadline" name="deadline" value={formData.deadline || ''} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>English Language Requirements</h2>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ielts_score">IELTS Score</label>
                  <input type="number" id="ielts_score" name="ielts_score" value={formData.ielts_score ?? ''} onChange={handleChange} min="0" max="9" step="0.5" placeholder="e.g., 6.5" />
                </div>
                <div className="form-group">
                  <label htmlFor="toefl_score">TOEFL Score</label>
                  <input type="number" id="toefl_score" name="toefl_score" value={formData.toefl_score ?? ''} onChange={handleChange} min="0" max="120" placeholder="e.g., 80" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="gre_score">GRE Score</label>
                  <input type="number" id="gre_score" name="gre_score" value={formData.gre_score ?? ''} onChange={handleChange} min="260" max="340" placeholder="e.g., 310" />
                </div>
                <div className="form-group">
                  <label htmlFor="gmat_score">GMAT Score</label>
                  <input type="number" id="gmat_score" name="gmat_score" value={formData.gmat_score ?? ''} onChange={handleChange} min="200" max="800" placeholder="e.g., 600" />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Additional Information</h2>

              <div className="form-group checkbox-group">
                <label>
                  <input type="checkbox" name="scholarships_available" checked={formData.scholarships_available || false} onChange={handleChange} />
                  <span>Scholarships Available</span>
                </label>
              </div>

              {formData.scholarships_available && (
                <div className="form-group">
                  <label htmlFor="scholarships_description">Scholarships Description</label>
                  <textarea id="scholarships_description" name="scholarships_description" value={formData.scholarships_description || ''} onChange={handleChange} rows={3} placeholder="Describe available scholarships..." />
                </div>
              )}

              <div className="form-group checkbox-group">
                <label>
                  <input type="checkbox" name="uniassist_required" checked={formData.uniassist_required || false} onChange={handleChange} />
                  <span>UniAssist Required</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="remark">Remarks</label>
                <textarea id="remark" name="remark" value={formData.remark || ''} onChange={handleChange} rows={2} placeholder="Any additional notes..." />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => navigate('/universities')}>Cancel</button>
              <button type="submit" className="btn-submit" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Update University' : 'Add University'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default UniversityForm;
