import { Fragment, type FormEvent } from 'react';
import {
  ArrowRight, Calendar, Check, ChevronLeft, Sparkles, Users, X,
} from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  travelers: number;
  travelDate: Date | string | null;
  endDate: Date | string | null;
  message: string;
}

interface BookingModalProps {
  open: boolean;
  formData: BookingFormData;
  formErrors: Record<string, string>;
  currentStep: number;
  isSubmittingBooking: boolean;
  setFormData: (data: BookingFormData) => void;
  setFormErrors: (errors: Record<string, string>) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export default function BookingModal({
  open,
  formData,
  formErrors,
  currentStep,
  isSubmittingBooking,
  setFormData,
  setFormErrors,
  onNext,
  onPrevious,
  onSubmit,
  onClose,
}: BookingModalProps) {
  return open ? (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-max-height-mobile">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl lg:max-w-5xl w-full max-h-[95vh] overflow-y-auto modal-max-height-mobile">
            <div className="sticky top-0 bg-gradient-to-r from-brand-accent-500 to-brand-500 p-6 lg:p-8 text-white modal-header-padding-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl lg:text-3xl font-black mb-2">
                    Book Your Adventure
                  </h3>
                  <p className="text-brand-accent-100 text-sm lg:text-base">
                    Fill in your details and we'll get back to you within 24 hours
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 lg:w-8 lg:h-8" />
                </button>
              </div>
            </div>
            {/* Step Progress Indicator */}
            <div className="px-6 lg:px-8 pt-6">
              <div className="flex items-center justify-between mb-6">
                {[1, 2, 3].map((step) => (
                  <Fragment key={step}>
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                          currentStep >= step
                            ? 'bg-brand-accent-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {currentStep > step ? <Check className="w-5 h-5" /> : step}
                      </div>
                      <p className={`text-xs mt-2 font-semibold ${
                        currentStep >= step ? 'text-brand-accent-600' : 'text-gray-400'
                      }`}>
                        {step === 1 ? 'Contact' : step === 2 ? 'Travel' : 'Review'}
                      </p>
                    </div>
                    {step < 3 && (
                      <div className={`flex-1 h-0.5 mx-4 ${
                        currentStep > step ? 'bg-brand-accent-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </Fragment>
                ))}
              </div>
            </div>

            <form onSubmit={onSubmit} className="p-6 lg:p-8 space-y-6 modal-form-padding-sm relative">
              {/* Step 1: Contact Information */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h4>
                    <p className="text-sm text-gray-600 mb-6">Let's start with your contact details</p>
                  </div>
                  
                  {/* Email - Required */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <label className="block text-sm font-black text-gray-900">Email Address</label>
                      <span className="px-2.5 py-1 text-xs font-bold text-brand-accent-600 bg-brand-accent-100 rounded-full">Required</span>
                    </div>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({...formData, email: e.target.value});
                        if (formErrors.email) {
                          setFormErrors({...formErrors, email: ''});
                        }
                      }}
                      className={`w-full px-5 py-4 text-base border-2 rounded-2xl focus:ring-4 focus:ring-brand-accent-100 transition-all form-input-mobile ${
                        formErrors.email
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-brand-accent-500/30 focus:border-brand-accent-500 bg-brand-accent-50/50'
                      }`}
                      placeholder="your.email@example.com"
                    />
                    {formErrors.email && (
                      <p className="text-red-600 text-sm font-semibold mt-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {formErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="form-grid-mobile lg:grid-cols-2 grid gap-6">
                    {/* Name - Optional */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <label className="block text-sm font-semibold text-gray-700">Full Name</label>
                        <span className="text-xs text-gray-500">(Optional)</span>
                      </div>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({...formData, name: e.target.value});
                          if (formErrors.name) {
                            setFormErrors({...formErrors, name: ''});
                          }
                        }}
                        className="w-full px-5 py-4 text-base border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-brand-accent-100 focus:border-brand-accent-500 transition-all form-input-mobile bg-white hover:bg-gray-50"
                        placeholder="John Doe"
                      />
                    </div>

                    {/* Phone - Optional with country code */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <label className="block text-sm font-semibold text-gray-700">Phone Number</label>
                        <span className="text-xs text-gray-500">(Optional)</span>
                      </div>
                      <PhoneInput
                        international
                        defaultCountry="LK"
                        value={formData.phone}
                        onChange={(value) => {
                          setFormData({...formData, phone: value || ''});
                          if (formErrors.phone) {
                            setFormErrors({...formErrors, phone: ''});
                          }
                        }}
                        className="phone-input-wrapper"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={onNext}
                      className="w-full bg-gradient-to-r from-brand-accent-500 to-brand-500 text-white py-4 lg:py-5 rounded-2xl font-black text-base lg:text-lg hover:shadow-2xl transform hover:scale-105 transition-all flex items-center justify-center gap-3 button-padding-sm"
                    >
                      Next Step
                      <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Travel Details */}
              {currentStep === 2 && (
                <div className="space-y-8">
                  {/* Enhanced Header */}
                  <div className="text-center pb-4 border-b border-brand-accent-100">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-accent-400 to-brand-500 rounded-2xl mb-4 shadow-lg">
                      <Calendar className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-2xl lg:text-3xl font-black text-gray-900 mb-2 bg-gradient-to-r from-brand-accent-600 to-brand-600 bg-clip-text text-transparent">
                      Plan Your Journey
                    </h4>
                    <p className="text-sm text-gray-600">Select your travel dates and preferences</p>
                  </div>

                  {/* Date Range Picker - Enhanced */}
                  <div className="bg-gradient-to-br from-brand-accent-50/50 to-brand-50/30 rounded-3xl p-6 lg:p-8 border-2 border-brand-accent-100 shadow-lg w-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-brand-accent-100 rounded-xl flex-shrink-0">
                        <Calendar className="w-5 h-5 text-brand-accent-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <label className="block text-base font-bold text-gray-900">Travel Date Range</label>
                        <span className="text-xs text-brand-accent-600 font-medium">Click dates to select your range</span>
                      </div>
                    </div>
                    <div className="flex justify-center bg-white rounded-2xl p-4 lg:p-6 shadow-inner w-full overflow-x-auto">
                      <DatePicker
                          selected={formData.travelDate ? (typeof formData.travelDate === 'string' ? new Date(formData.travelDate) : formData.travelDate) : null}
                          onChange={(dates: Date | [Date | null, Date | null] | null) => {
                          // With selectsRange, dates is either [start, end] array or a single Date
                          if (dates) {
                            if (Array.isArray(dates)) {
                              // Both dates selected - [startDate, endDate]
                              const [start, end] = dates;
                              setFormData({
                                ...formData,
                                travelDate: start || null,
                                endDate: end || null,
                              });
                            } else {
                              // Single date clicked - react-datepicker handles range selection automatically
                              // First click sets start, second click sets end
                              // We just need to update our state accordingly
                              if (!formData.travelDate || formData.endDate) {
                                // Starting new selection or resetting
                                setFormData({
                                  ...formData,
                                  travelDate: dates,
                                  endDate: null,
                                });
                              } else {
                                // Second date clicked - set as end date
                                if (dates >= (formData.travelDate as Date)) {
                                  setFormData({
                                    ...formData,
                                    endDate: dates,
                                  });
                                } else {
                                  // Selected date is before start, make it the new start
                                  setFormData({
                                    ...formData,
                                    travelDate: dates,
                                    endDate: null,
                                  });
                                }
                              }
                            }
                          } else {
                            // Cleared
                            setFormData({
                              ...formData,
                              travelDate: null,
                              endDate: null,
                            });
                          }
                        }}
                        startDate={formData.travelDate ? (typeof formData.travelDate === 'string' ? new Date(formData.travelDate) : formData.travelDate) : null}
                        endDate={formData.endDate ? (typeof formData.endDate === 'string' ? new Date(formData.endDate) : formData.endDate) : null}
                        selectsRange
                        inline
                        minDate={new Date()}
                        calendarClassName="!shadow-2xl !border-gray-200 !rounded-2xl"
                      />
                    </div>
                    {formData.travelDate && (
                      <div className={`mt-4 p-4 rounded-xl transition-all duration-300 ${
                        formData.endDate 
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' 
                          : 'bg-gradient-to-r from-brand-accent-50 to-brand-50 border-2 border-brand-accent-200'
                      }`}>
                        <div className="flex items-center gap-2 justify-center">
                          <Check className={`w-5 h-5 ${formData.endDate ? 'text-green-600' : 'text-brand-accent-600'}`} />
                          <p className={`text-sm font-bold ${formData.endDate ? 'text-green-800' : 'text-brand-accent-800'}`}>
                            {formData.endDate 
                              ? `Selected: ${(typeof formData.travelDate === 'string' ? new Date(formData.travelDate) : formData.travelDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${(typeof formData.endDate === 'string' ? new Date(formData.endDate) : formData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                              : `Start Date: ${(typeof formData.travelDate === 'string' ? new Date(formData.travelDate) : formData.travelDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - Select end date`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Travelers & Requests Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Number of Travelers - Enhanced */}
                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl p-6 border-2 border-blue-100 hover:border-blue-200 transition-all min-w-0">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-xl flex-shrink-0">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <label className="block text-base font-bold text-gray-900">Number of Travelers</label>
                          <span className="text-xs text-gray-500">(Optional)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, travelers: Math.max(1, formData.travelers - 1)})}
                          className="w-12 h-12 rounded-xl bg-white border-2 border-blue-200 text-blue-600 font-bold text-lg hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center shadow-sm"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={formData.travelers}
                          onChange={(e) => setFormData({...formData, travelers: +e.target.value || 1})}
                          className="flex-1 px-5 py-4 text-center text-2xl font-bold border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all bg-white"
                          placeholder="2"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, travelers: formData.travelers + 1})}
                          className="w-12 h-12 rounded-xl bg-white border-2 border-blue-200 text-blue-600 font-bold text-lg hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Special Requests - Enhanced */}
                    <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/30 rounded-2xl p-6 border-2 border-purple-100 hover:border-purple-200 transition-all min-w-0">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-100 rounded-xl flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <label className="block text-base font-bold text-gray-900">Special Requests</label>
                          <span className="text-xs text-gray-500">(Optional)</span>
                        </div>
                      </div>
                      <textarea
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        className="w-full px-5 py-4 text-base border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-400 transition-all resize-none bg-white hover:bg-purple-50/50 placeholder:text-gray-400"
                        placeholder="Any dietary requirements, accessibility needs, or special occasions? We're here to make your trip perfect!"
                      />
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-6 flex gap-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={onPrevious}
                      className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold text-base lg:text-lg hover:bg-gray-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 button-padding-sm"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={onNext}
                      className="flex-1 bg-gradient-to-r from-brand-accent-500 to-brand-500 text-white py-4 rounded-2xl font-black text-base lg:text-lg hover:shadow-2xl transform hover:scale-105 transition-all flex items-center justify-center gap-3 button-padding-sm"
                    >
                      Next Step
                      <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Submit */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-4">Review & Submit</h4>
                    <p className="text-sm text-gray-600 mb-6">Please review your information before submitting</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                    <div className="border-b border-gray-200 pb-4">
                      <h5 className="font-bold text-gray-900 mb-3">Contact Information</h5>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-semibold">Email:</span> {formData.email || <span className="text-gray-400">Not provided</span>}</p>
                        <p><span className="font-semibold">Name:</span> {formData.name || <span className="text-gray-400">Not provided</span>}</p>
                        <p><span className="font-semibold">Phone:</span> {formData.phone || <span className="text-gray-400">Not provided</span>}</p>
                      </div>
                    </div>
                    <div className="border-b border-gray-200 pb-4">
                      <h5 className="font-bold text-gray-900 mb-3">Travel Details</h5>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-semibold">Date Range:</span> {
                          formData.travelDate && formData.endDate
                            ? `${(typeof formData.travelDate === 'string' ? new Date(formData.travelDate) : formData.travelDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${(typeof formData.endDate === 'string' ? new Date(formData.endDate) : formData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : formData.travelDate
                            ? `${(typeof formData.travelDate === 'string' ? new Date(formData.travelDate) : formData.travelDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (Start only)`
                            : <span className="text-gray-400">Not provided</span>
                        }</p>
                        <p><span className="font-semibold">Travelers:</span> {formData.travelers || 1}</p>
                        <p><span className="font-semibold">Special Requests:</span> {formData.message || <span className="text-gray-400">None</span>}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={onPrevious}
                      className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold text-base lg:text-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2 button-padding-sm"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Previous
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingBooking}
                      className={`flex-1 bg-gradient-to-r from-brand-accent-500 to-brand-500 text-white py-4 rounded-2xl font-black text-base lg:text-lg hover:shadow-2xl transform hover:scale-105 transition-all flex items-center justify-center gap-3 button-padding-sm ${
                        isSubmittingBooking ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSubmittingBooking
                        ? 'Submitting...'
                        : 'Submit Booking Request'}
                      <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
  ) : null;
}
