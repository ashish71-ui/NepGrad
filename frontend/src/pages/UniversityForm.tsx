import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import universityService from '../services/universityService';
import type { University } from '../services/universityService';
import './UniversityForm.css';

interface UniversityFormProps {
  isEditing?: boolean;
}

const UniversityForm: React.FC<UniversityFormProps> = ({ isEditing = false }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [universityData, setUniversityData] = useState<University | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      loadUniversity(parseInt(id));
    }
  }, [isEditing, id]);

  const loadUniversity = async (universityId: number) => {
    try {
      setLoading(true);
      const data = await universityService.getUniversity(universityId);
      setUniversityData(data);
    } catch (err) {
      setError('Failed to load university data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    country: '',
    city: '',
    address: '',
    deadline: '',
    application_fee: '',
    tuition_fee: '',
    admission_rate: '',
    founded_year: '',
    university_type: 'private',
    ranking: '',
    ielts_score: '',
    toefl_score: '',
    gre_score: '',
    gmat_score: '',
    scholarships_available: false,
    scholarships_description: '',
    email: '',
    phone: '',
    is_active: true,
  });

  useEffect(() => {
    if (universityData) {
      setFormData({
        name: universityData.name || '',
        description: universityData.description || '',
        website: universityData.website || '',
        country: universityData.country || '',
        city: universityData.city || '',
        address: universityData.address || '',
        deadline: universityData.deadline || '',
        application_fee: universityData.application_fee?.toString() || '',
        tuition_fee: universityData.tuition_fee?.toString() || '',
        admission_rate: universityData.admission_rate?.toString() || '',
        founded_year: universityData.founded_year?.toString() || '',
        university_type: universityData.university_type || 'private',
        ranking: universityData.ranking?.toString() || '',
        ielts_score: universityData.ielts_score?.toString() || '',
        toefl_score: universityData.toefl_score?.toString() || '',
        gre_score: universityData.gre_score?.toString() || '',
        gmat_score: universityData.gmat_score?.toString() || '',
        scholarships_available: universityData.scholarships_available || false,
        scholarships_description: universityData.scholarships_description || '',
        email: universityData.email || '',
        phone: universityData.phone || '',
        is_active: universityData.is_active ?? true,
      });
    }
  }, [universityData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const data = {
        ...formData,
        application_fee: formData.application_fee ? parseFloat(formData.application_fee as string) : null,
        tuition_fee: formData.tuition_fee ? parseFloat(formData.tuition_fee as string) : null,
        admission_rate: formData.admission_rate ? parseFloat(formData.admission_rate as string) : null,
        founded_year: formData.founded_year ? parseInt(formData.founded_year as string) : null,
        ranking: formData.ranking ? parseInt(formData.ranking as string) : null,
        ielts_score: formData.ielts_score ? parseFloat(formData.ielts_score as string) : null,
        toefl_score: formData.toefl_score ? parseInt(formData.toefl_score as string) : null,
        gre_score: formData.gre_score ? parseInt(formData.gre_score as string) : null,
        gmat_score: formData.gmat_score ? parseInt(formData.gmat_score as string) : null,
      };

      if (isEditing && universityData) {
        await universityService.updateUniversity(universityData.id, data);
        setSuccess('University updated successfully!');
      } else {
        await universityService.createUniversity(data);
        setSuccess('University created successfully!');
      }
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Failed to save university');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="form-container">
        <div className="form-card">
          <div className="form-loading">
            <div className="loading-spinner"></div>
            <p>Loading university data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-card">
        <div className="form-header">
          <h1>{isEditing ? 'Edit University' : 'Add New University'}</h1>
          <p>Fill in the university information below</p>
        </div>

        <form onSubmit={handleSubmit} className="university-form">
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}

          <fieldset>
            <legend>Basic Information</legend>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">University Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter university name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="university_type">Type</label>
                <select
                  id="university_type"
                  name="university_type"
                  value={formData.university_type}
                  onChange={handleChange}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="government">Government</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Enter university description"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="website">Website</label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="ranking">World Ranking</label>
                <input
                  type="number"
                  id="ranking"
                  name="ranking"
                  value={formData.ranking}
                  onChange={handleChange}
                  placeholder="e.g., 100"
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Location</legend>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="country">Country *</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                  placeholder="e.g., USA, UK, Nepal"
                />
              </div>
              <div className="form-group">
                <label htmlFor="city">City *</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Boston, London"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="address">Address</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Full address"
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>Admission Details</legend>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="deadline">Application Deadline</label>
                <input
                  type="date"
                  id="deadline"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="application_fee">Application Fee</label>
                <input
                  type="number"
                  id="application_fee"
                  name="application_fee"
                  value={formData.application_fee}
                  onChange={handleChange}
                  placeholder="e.g., 50"
                  step="0.01"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tuition_fee">Tuition Fee (per year)</label>
                <input
                  type="number"
                  id="tuition_fee"
                  name="tuition_fee"
                  value={formData.tuition_fee}
                  onChange={handleChange}
                  placeholder="e.g., 20000"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label htmlFor="admission_rate">Admission Rate (%)</label>
                <input
                  type="number"
                  id="admission_rate"
                  name="admission_rate"
                  value={formData.admission_rate}
                  onChange={handleChange}
                  placeholder="e.g., 25"
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Requirements</legend>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ielts_score">Minimum IELTS Score</label>
                <input
                  type="number"
                  id="ielts_score"
                  name="ielts_score"
                  value={formData.ielts_score}
                  onChange={handleChange}
                  placeholder="e.g., 6.5"
                  step="0.1"
                  min="0"
                  max="9"
                />
              </div>
              <div className="form-group">
                <label htmlFor="toefl_score">Minimum TOEFL Score</label>
                <input
                  type="number"
                  id="toefl_score"
                  name="toefl_score"
                  value={formData.toefl_score}
                  onChange={handleChange}
                  placeholder="e.g., 80"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="gre_score">GRE Score (optional)</label>
                <input
                  type="number"
                  id="gre_score"
                  name="gre_score"
                  value={formData.gre_score}
                  onChange={handleChange}
                  placeholder="e.g., 300"
                />
              </div>
              <div className="form-group">
                <label htmlFor="gmat_score">GMAT Score (optional)</label>
                <input
                  type="number"
                  id="gmat_score"
                  name="gmat_score"
                  value={formData.gmat_score}
                  onChange={handleChange}
                  placeholder="e.g., 650"
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Scholarships</legend>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="scholarships_available"
                  checked={formData.scholarships_available}
                  onChange={handleChange}
                />
                Scholarships Available
              </label>
            </div>
            {formData.scholarships_available && (
              <div className="form-group">
                <label htmlFor="scholarships_description">Scholarship Details</label>
                <textarea
                  id="scholarships_description"
                  name="scholarships_description"
                  value={formData.scholarships_description}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Describe available scholarships"
                />
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend>Contact Information</legend>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admissions@university.edu"
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
          </fieldset>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update University' : 'Create University'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UniversityForm;
