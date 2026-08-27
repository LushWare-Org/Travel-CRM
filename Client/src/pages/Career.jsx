import { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Upload,
  Loader,
  FileText,
  X
} from 'lucide-react';
import careerService from '../utils/careerApi';
import BRANDING from '../config/branding';
import { HERO_TITLE, HIRING_PERKS } from '../content/career';

export default function Career() {
  const [vacancies, setVacancies] = useState([]);
  const [loadingVacancies, setLoadingVacancies] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    position: '',
    coverLetter: '',
    resume: null,
    agreeTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchVacancies();
  }, []);

  const fetchVacancies = async () => {
    try {
      setLoadingVacancies(true);
      const response = await careerService.getActiveVacancies({ status: 'active' });
      if (response.status === 'success' && response.data) {
        setVacancies(response.data.vacancies || []);
      } else {
        setVacancies(response.data?.vacancies || []);
      }
    } catch (error) {
      console.error('Error fetching vacancies:', error);
      setVacancies([]);
    } finally {
      setLoadingVacancies(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? e.target.checked : undefined;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        resume: 'Only PDF, DOC, or DOCX files are allowed',
      }));
      return;
    }

    if (file.size > maxFileSize) {
      setErrors((prev) => ({
        ...prev,
        resume: 'File size must be less than 10MB',
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, resume: file }));
    if (errors.resume) setErrors((prev) => ({ ...prev, resume: '' }));
  };

  const handleRemoveResume = () => {
    setFormData((prev) => ({ ...prev, resume: null }));
    const input = document.getElementById('resumeInput');
    if (input) {
      input.value = '';
    }
    setErrors((prev) => ({ ...prev, resume: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Invalid email address';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.position.trim()) newErrors.position = 'Please select a position from available options';
    if (!formData.resume) newErrors.resume = 'Please upload your resume';
    if (!formData.agreeTerms) newErrors.agreeTerms = 'You must agree to the terms';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      setUploadProgress(20);
      let resumeUrl = null;

      if (formData.resume) {
        console.log('Starting imgbb upload with file:', formData.resume.name, formData.resume.size);

        if (!BRANDING.integrations.imgbbApiKey) {
          console.error('imgbb API key not configured');
          setSubmitStatus('error');
          setErrors((prev) => ({
            ...prev,
            submit: 'Resume upload is not configured for this site.',
          }));
          setIsSubmitting(false);
          return;
        }

        const imgbbFormData = new FormData();
        imgbbFormData.append('image', formData.resume);

        setUploadProgress(40);
        try {
          console.log('Sending to imgbb API...');
          const imgbbResponse = await fetch(
            `${BRANDING.integrations.imgbbUploadUrl}?key=${BRANDING.integrations.imgbbApiKey}`,
            {
              method: 'POST',
              body: imgbbFormData,
            }
          );

          console.log('imgbb Response status:', imgbbResponse.status);

          if (!imgbbResponse.ok) {
            const errorText = await imgbbResponse.text();
            console.error('imgbb error response:', errorText);
            throw new Error(`imgbb HTTP ${imgbbResponse.status}: ${errorText}`);
          }

          const imgbbData = await imgbbResponse.json();
          console.log('imgbb full response:', imgbbData);

          if (!imgbbData.success) {
            console.error('imgbb success false:', imgbbData);
            throw new Error(imgbbData.error?.message || 'imgbb upload failed - success is false');
          }

          if (!imgbbData.data?.url) {
            console.error('imgbb no URL in data:', imgbbData.data);
            throw new Error('imgbb did not return URL');
          }

          resumeUrl = imgbbData.data.url;
          console.log('✓ Resume uploaded to imgbb:', resumeUrl);
        } catch (imgbbError) {
          console.error('✗ imgbb upload error:', imgbbError);
          setSubmitStatus('error');
          setErrors((prev) => ({
            ...prev,
            submit: `Resume upload to imgbb failed: ${imgbbError.message}`,
          }));
          setIsSubmitting(false);
          return;
        }
      }

      if (!resumeUrl) {
        console.error('No resumeUrl after upload attempt');
        throw new Error('Resume URL is required - upload may have failed');
      }

      setUploadProgress(60);
      const submitData = {
        fullName: formData.fullName?.trim() || '',
        email: formData.email?.trim() || '',
        phone: formData.phone?.trim() || '',
        position: formData.position?.trim() || '',
        coverLetter: formData.coverLetter?.trim() || '',
        agreeTerms: formData.agreeTerms === true,
        resumeUrl: resumeUrl,
        resumeFileName: formData.resume.name,
      };

      console.log('✓ Submit data ready:', submitData);

      setUploadProgress(80);
      const response = await careerService.submitApplication(submitData);

      if (response.status === 'success') {
        setUploadProgress(100);
        setSubmitStatus('success');
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          position: '',
          coverLetter: '',
          resume: null,
          agreeTerms: false,
        });
        const input = document.getElementById('resumeInput');
        if (input) input.value = '';
        setTimeout(() => {
          setSubmitStatus(null);
          setUploadProgress(0);
        }, 6000);
      }
    } catch (err) {
      console.error('✗ Submission error:', err);
      setSubmitStatus('error');
      setErrors((prev) => ({
        ...prev,
        submit: err.message || 'Failed to submit application',
      }));
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative py-16 overflow-hidden bg-black text-white">
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">{HERO_TITLE}</h1>
          <p className="text-xl max-w-3xl mx-auto opacity-95">
            Help millions of travelers create unforgettable memories. Be part of a passionate team that loves what they do.
          </p>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-10">Open Positions</h2>
          {loadingVacancies ? (
            <div className="text-center py-8">
              <Loader className="w-8 h-8 animate-spin mx-auto text-brand-600" />
              <p className="text-gray-600 mt-2">Loading positions...</p>
            </div>
          ) : vacancies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {vacancies.map((job) => (
                <div
                  key={job._id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{job.position}</h3>
                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <p>{job.type}</p>
                    <p>{job.location}</p>
                    {job.experience?.min !== undefined && (
                      <p>{job.experience.min}+ years experience</p>
                    )}
                  </div>
                  <a
                    href="#apply-form"
                    onClick={(e) => {
                      e.preventDefault();
                      setFormData(prev => ({ ...prev, position: job.position }));
                      const formElement = document.getElementById('apply-form');
                      if (formElement) {
                        formElement.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="text-brand-600 font-medium text-sm hover:text-brand-700 transition-colors flex items-center gap-2"
                  >
                    Apply Now <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No open positions available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* Application Section */}
      <section className="py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="space-y-8">
              <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-br from-brand-600 to-brand-accent-400 text-white px-8 py-5">
                  <h3 className="text-3xl font-bold flex items-center gap-3">
                    <Briefcase className="w-8 h-8" />
                    We're Hiring!
                  </h3>
                </div>
                <div className="p-8 space-y-7">
                  <div>
                    <ul className="space-y-3 text-gray-700">
                      {HIRING_PERKS.map((perk) => (
                        <li key={perk} className="flex items-start gap-3">
                          <span className="text-brand-600 mt-1">✓</span>
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 lg:p-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Apply Now</h2>
                <p className="text-gray-600 mb-8">Fill out the form below to apply for your desired position</p>

                {submitStatus === 'success' && (
                  <div className="mb-8 p-5 bg-green-50 border-2 border-green-200 rounded-xl flex gap-4">
                    <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-green-900">Application Submitted Successfully!</p>
                      <p className="text-green-700">Thank you for your application. We'll review it and get back to you.</p>
                    </div>
                  </div>
                )}
                {submitStatus === 'error' && (
                  <div className="mb-8 p-5 bg-red-50 border-2 border-red-200 rounded-xl flex gap-4">
                    <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-red-900">Application Failed</p>
                      <p className="text-red-700">{errors.submit || 'Something went wrong. Please try again.'}</p>
                    </div>
                  </div>
                )}

                <form id="apply-form" onSubmit={handleSubmit} className="space-y-7">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Full Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition ${errors.fullName
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
                        }`}
                      placeholder="John Doe"
                    />
                    {errors.fullName && <p className="text-red-600 text-sm mt-1">{errors.fullName}</p>}
                  </div>

                  {/* Email & Phone */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Email <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition ${errors.email
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
                          }`}
                        placeholder="john@example.com"
                      />
                      {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Phone <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition ${errors.phone
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
                          }`}
                        placeholder="Your phone number"
                      />
                      {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                    </div>
                  </div>

                  {/* Position Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Select Position <span className="text-red-600">*</span>
                    </label>
                    <select
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition ${errors.position
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
                        }`}
                    >
                      <option value="">-- Choose a position --</option>
                      {vacancies.map((pos) => (
                        <option key={pos._id} value={pos.position}>
                          {pos.position} - {pos.location}
                        </option>
                      ))}
                    </select>
                    {errors.position && <p className="text-red-600 text-sm mt-1">{errors.position}</p>}
                  </div>

                  {/* Cover Letter */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Cover Letter / Message
                    </label>
                    <textarea
                      name="coverLetter"
                      value={formData.coverLetter}
                      onChange={handleInputChange}
                      rows={6}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition resize-none ${errors.coverLetter
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
                        }`}
                      placeholder="Tell us why you'd be a great fit for this position..."
                    />
                    {errors.coverLetter && <p className="text-red-600 text-sm mt-1">{errors.coverLetter}</p>}
                  </div>

                  {/* Resume Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Resume / CV <span className="text-red-600">*</span>
                    </label>
                    {!formData.resume ? (
                      <label
                        htmlFor="resumeInput"
                        className={`block border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition ${errors.resume
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-300 hover:border-brand-500 hover:bg-brand-50'
                          }`}
                      >
                        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="font-medium text-gray-700">Drop your file here or click to browse</p>
                        <p className="text-xs text-gray-500 mt-2">PDF, DOC, DOCX up to 10MB</p>
                        <input
                          id="resumeInput"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-green-600" />
                          <div>
                            <p className="font-semibold text-green-700">{formData.resume.name}</p>
                            <p className="text-sm text-green-600">
                              {(formData.resume.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveResume}
                          className="text-red-600 hover:text-red-700 p-2"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    )}
                    {errors.resume && <p className="text-red-600 text-sm mt-2">{errors.resume}</p>}
                  </div>

                  {/* Terms */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="agreeTerms"
                      id="agreeTerms"
                      checked={formData.agreeTerms}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 mt-1"
                    />
                    <label htmlFor="agreeTerms" className="text-sm text-gray-700">
                      I confirm that I have read and agree to the terms and conditions. I understand that my information will be stored and used for recruitment purposes only.
                      <span className="text-red-600"> *</span>
                    </label>
                  </div>
                  {errors.agreeTerms && <p className="text-red-600 text-sm -mt-4">{errors.agreeTerms}</p>}

                  {/* Submit Button with Progress */}
                  <div className="space-y-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-black text-white font-bold rounded-xl shadow-lg transition hover:bg-gray-800 disabled:opacity-60 flex items-center justify-center gap-3"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader className="w-6 h-6 animate-spin" />
                          Submitting Application...
                        </>
                      ) : (
                        <>
                          Submit Application
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                    {isSubmitting && uploadProgress > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-brand-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}