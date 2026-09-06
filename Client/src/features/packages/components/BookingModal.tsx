import { type FormEvent } from 'react';
import {
  ArrowRight, Calendar, Check, ChevronLeft, Sparkles, Users, X,
} from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Stepper from '@/components/shared/Stepper';

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

const BOOKING_STEPS = [
  { label: 'Contact' },
  { label: 'Travel' },
  { label: 'Review' },
];

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
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col rounded-3xl bg-white p-0 text-gray-900 shadow-modal ring-1 ring-gray-200 max-w-4xl lg:max-w-5xl max-h-[95vh] overflow-hidden"
      >
        <DialogHeader className="sticky top-0 z-elevated flex-row items-center justify-between gap-4 rounded-t-3xl bg-brand-600 p-6 lg:p-8 text-white max-sm:p-5">
          <div className="min-w-0">
            <DialogTitle className="text-2xl lg:text-3xl font-black text-white leading-tight mb-2">
              Book Your Adventure
            </DialogTitle>
            <DialogDescription className="text-brand-100 text-sm lg:text-base">
              Fill in your details and we'll get back to you within 24 hours
            </DialogDescription>
          </div>
          <DialogClose
            aria-label="Close booking dialog"
            className="flex-shrink-0 p-2 rounded-xl text-white hover:bg-white/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X className="w-6 h-6 lg:w-8 lg:h-8" />
          </DialogClose>
        </DialogHeader>

        <div className="overflow-y-auto">
          {/* Step Progress Indicator */}
          <div className="px-6 lg:px-8 pt-6 max-sm:px-5">
            <Stepper steps={BOOKING_STEPS} currentStep={currentStep} className="mb-6" />
          </div>

          <form onSubmit={onSubmit} className="p-6 lg:p-8 space-y-6 max-sm:p-5 relative">
            {/* Step 1: Contact Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h4>
                  <p className="text-sm text-gray-600 mb-6">Let's start with your contact details</p>
                </div>

                {/* Email - Required */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <label className="block text-sm font-black text-gray-900">Email Address</label>
                    <span className="px-2.5 py-1 text-xs font-bold text-brand-700 bg-brand-100 rounded-full">Required</span>
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
                    className={`w-full px-5 py-4 text-base border-2 rounded-2xl focus:ring-4 transition-all max-sm:px-4 max-sm:py-3 ${
                      formErrors.email
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                        : 'border-gray-300 focus:border-brand-600 focus:ring-brand-100 bg-white'
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-brand-100 focus:border-brand-600 transition-all bg-white hover:bg-gray-50 max-sm:px-4 max-sm:py-3"
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
                    className="w-full bg-brand-600 text-white py-4 lg:py-5 rounded-xl font-black text-base lg:text-lg hover:bg-brand-700 transition-colors flex items-center justify-center gap-3 max-sm:py-3.5"
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
                <div className="text-center pb-4 border-b border-gray-200">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-4">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-2xl lg:text-3xl font-black text-gray-900 mb-2">
                    Plan Your Journey
                  </h4>
                  <p className="text-sm text-gray-600">Select your travel dates and preferences</p>
                </div>

                {/* Date Range Picker - Enhanced */}
                <div className="bg-gray-50 rounded-3xl p-6 lg:p-8 border border-gray-200 w-full max-sm:p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-brand-100 rounded-xl flex-shrink-0">
                      <Calendar className="w-5 h-5 text-brand-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="block text-base font-bold text-gray-900">Travel Date Range</label>
                      <span className="text-xs text-gray-600 font-medium">Click dates to select your range</span>
                    </div>
                  </div>
                  <div className="flex justify-center bg-white rounded-2xl p-4 lg:p-6 border border-gray-200 w-full overflow-x-auto">
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
                      calendarClassName="!shadow-floating !border-gray-200 !rounded-2xl"
                    />
                  </div>
                  {formData.travelDate && (
                    <div className={`mt-4 p-4 rounded-xl transition-all duration-300 ${
                      formData.endDate
                        ? 'bg-green-50 border-2 border-green-200'
                        : 'bg-brand-50 border-2 border-brand-200'
                    }`}>
                      <div className="flex items-center gap-2 justify-center">
                        <Check className={`w-5 h-5 ${formData.endDate ? 'text-green-700' : 'text-brand-700'}`} />
                        <p className={`text-sm font-bold ${formData.endDate ? 'text-green-800' : 'text-brand-800'}`}>
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
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 transition-colors min-w-0 max-sm:p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-brand-100 rounded-xl flex-shrink-0">
                        <Users className="w-5 h-5 text-brand-700" />
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
                        className="w-12 h-12 rounded-xl bg-white border-2 border-gray-300 text-gray-700 font-bold text-lg hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center flex-shrink-0"
                        aria-label="Decrease travelers"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={formData.travelers}
                        onChange={(e) => setFormData({...formData, travelers: +e.target.value || 1})}
                        className="flex-1 min-w-0 px-5 py-4 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-brand-100 focus:border-brand-600 transition-all bg-white"
                        placeholder="2"
                        aria-label="Number of travelers"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, travelers: formData.travelers + 1})}
                        className="w-12 h-12 rounded-xl bg-white border-2 border-gray-300 text-gray-700 font-bold text-lg hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center flex-shrink-0"
                        aria-label="Increase travelers"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Special Requests - Enhanced */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 transition-colors min-w-0 max-sm:p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-brand-100 rounded-xl flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-brand-700" />
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
                      className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-brand-100 focus:border-brand-600 transition-all resize-none bg-white hover:bg-gray-50 placeholder:text-gray-400"
                      placeholder="Any dietary requirements, accessibility needs, or special occasions? We're here to make your trip perfect!"
                    />
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="pt-6 flex gap-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onPrevious}
                    className="flex-1 bg-white text-gray-700 border border-gray-300 py-4 rounded-xl font-bold text-base lg:text-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={onNext}
                    className="flex-1 bg-brand-600 text-white py-4 rounded-xl font-black text-base lg:text-lg hover:bg-brand-700 transition-colors flex items-center justify-center gap-3"
                  >
                    Next Step
                    <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Submit */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-4">Review & Submit</h4>
                  <p className="text-sm text-gray-600 mb-6">Please review your information before submitting</p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-200 max-sm:p-5">
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
                    className="flex-1 bg-white text-gray-700 border border-gray-300 py-4 rounded-xl font-bold text-base lg:text-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Previous
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBooking}
                    className={`flex-1 bg-brand-600 text-white py-4 rounded-xl font-black text-base lg:text-lg hover:bg-brand-700 transition-colors flex items-center justify-center gap-3 ${
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
      </DialogContent>
    </Dialog>
  );
}
