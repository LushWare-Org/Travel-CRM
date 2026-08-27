import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Briefcase } from 'lucide-react';
import careerService from '../../services/api/career';
import { HERO_TITLE, HIRING_PERKS } from '../../content/career';
import VacancyList from './components/VacancyList';
import ApplicationForm from './components/ApplicationForm';
import { isImgbbConfigured, uploadResumeToImgbb } from './services/imageUpload';

/** A job opening as returned by GET /vacancies. */
export interface Vacancy {
  id: string;
  position: string;
  type: string;
  location: string;
  experienceMin?: number;
}

/** Raw application-form field state (pre-trim/pre-submit). */
export interface ApplicationFormData {
  fullName: string;
  email: string;
  phone: string;
  position: string;
  coverLetter: string;
  resume: File | null;
  agreeTerms: boolean;
}

/** Field-keyed validation messages (plus the 'submit' banner message). */
export type FormErrors = Record<string, string>;

export type SubmitStatus = 'success' | 'error' | null;

/** Payload sent to POST /careers/apply. */
export interface ApplicationPayload extends Record<string, unknown> {
  fullName: string;
  email: string;
  phone: string;
  position: string;
  coverLetter: string;
  agreeTerms: boolean;
  resumeUrl: string;
  resumeFileName: string;
}

const EMPTY_FORM: ApplicationFormData = {
  fullName: '',
  email: '',
  phone: '',
  position: '',
  coverLetter: '',
  resume: null,
  agreeTerms: false,
};

export default function CareerContainer() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loadingVacancies, setLoadingVacancies] = useState(true);
  const [formData, setFormData] = useState<ApplicationFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const fetchVacancies = async () => {
      try {
        setLoadingVacancies(true);
        const vacancies = await careerService.getActiveVacancies({ status: 'active' });
        setVacancies(vacancies);
      } catch (error) {
        console.error('Error fetching vacancies:', error);
        setVacancies([]);
      } finally {
        setLoadingVacancies(false);
      }
    };
    fetchVacancies();
  }, []);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
    const input = document.getElementById('resumeInput') as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }
    setErrors((prev) => ({ ...prev, resume: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
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

  const handleApply = (position: string) => {
    setFormData((prev) => ({ ...prev, position }));
    const formElement = document.getElementById('apply-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      setUploadProgress(20);
      let resumeUrl: string | null = null;

      if (formData.resume) {
        if (!isImgbbConfigured()) {
          console.error('imgbb API key not configured');
          setSubmitStatus('error');
          setErrors((prev) => ({
            ...prev,
            submit: 'Resume upload is not configured for this site.',
          }));
          setIsSubmitting(false);
          return;
        }

        setUploadProgress(40);
        try {
          resumeUrl = await uploadResumeToImgbb(formData.resume);
        } catch (imgbbError) {
          console.error('imgbb upload error:', imgbbError);
          setSubmitStatus('error');
          setErrors((prev) => ({
            ...prev,
            submit: `Resume upload to imgbb failed: ${(imgbbError as Error).message}`,
          }));
          setIsSubmitting(false);
          return;
        }
      }

      if (!resumeUrl) {
        throw new Error('Resume URL is required - upload may have failed');
      }

      setUploadProgress(60);
      const submitData: ApplicationPayload = {
        fullName: formData.fullName?.trim() || '',
        email: formData.email?.trim() || '',
        phone: formData.phone?.trim() || '',
        position: formData.position?.trim() || '',
        coverLetter: formData.coverLetter?.trim() || '',
        agreeTerms: formData.agreeTerms === true,
        resumeUrl,
        resumeFileName: formData.resume?.name ?? '',
      };

      setUploadProgress(80);
      const response = await careerService.submitApplication(submitData);

      if (response.status === 'success') {
        setUploadProgress(100);
        setSubmitStatus('success');
        setFormData(EMPTY_FORM);
        const input = document.getElementById('resumeInput') as HTMLInputElement | null;
        if (input) input.value = '';
        setTimeout(() => {
          setSubmitStatus(null);
          setUploadProgress(0);
        }, 6000);
      }
    } catch (err) {
      console.error('Submission error:', err);
      setSubmitStatus('error');
      setErrors((prev) => ({
        ...prev,
        submit: err instanceof Error ? err.message : 'Failed to submit application',
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

      <VacancyList vacancies={vacancies} loading={loadingVacancies} onApply={handleApply} />

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
              <ApplicationForm
                formData={formData}
                errors={errors}
                vacancies={vacancies}
                submitStatus={submitStatus}
                isSubmitting={isSubmitting}
                uploadProgress={uploadProgress}
                onChange={handleInputChange}
                onFileChange={handleFileChange}
                onRemoveResume={handleRemoveResume}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
