import type { ChangeEvent, FormEvent } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Upload,
  Loader,
  FileText,
  X,
  ArrowRight,
} from 'lucide-react';
import type { ApplicationFormData, FormErrors, SubmitStatus, Vacancy } from '../CareerContainer';

interface ApplicationFormProps {
  formData: ApplicationFormData;
  errors: FormErrors;
  vacancies: Vacancy[];
  submitStatus: SubmitStatus;
  isSubmitting: boolean;
  uploadProgress: number;
  onChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveResume: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

const ApplicationForm = ({
  formData,
  errors,
  vacancies,
  submitStatus,
  isSubmitting,
  uploadProgress,
  onChange,
  onFileChange,
  onRemoveResume,
  onSubmit,
}: ApplicationFormProps) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 lg:p-12">
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

      <form id="apply-form" onSubmit={onSubmit} className="space-y-7">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Full Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={onChange}
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
              onChange={onChange}
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
              onChange={onChange}
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
            onChange={onChange}
            className={`w-full px-4 py-3 rounded-lg border-2 transition ${errors.position
                ? 'border-red-400 bg-red-50'
                : 'border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
              }`}
          >
            <option value="">-- Choose a position --</option>
            {vacancies.map((pos) => (
              <option key={pos.id} value={pos.position}>
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
            onChange={onChange}
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
                onChange={onFileChange}
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
                onClick={onRemoveResume}
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
            onChange={onChange}
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
            className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-3"
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
  );
};

export default ApplicationForm;
