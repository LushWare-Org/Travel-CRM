import React from 'react';
import { XCircle, AlertTriangle, Clock, DollarSign } from 'lucide-react';

const CancellationPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-12 text-white">
          <div className="flex items-center justify-center mb-4">
            <XCircle size={48} className="mr-4" />
            <h1 className="text-4xl font-bold font-poppins">Cancellation Policy</h1>
          </div>
          <p className="text-center text-red-100 font-opensans">
            Important information about cancellations and refunds.
          </p>
          <p className="text-center text-sm mt-4 text-red-100">
            Last updated: December 23, 2025
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-10 space-y-8">
          {/* Important Notice */}
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6">
            <div className="flex items-start">
              <AlertTriangle className="text-yellow-600 mr-3 mt-1 flex-shrink-0" size={24} />
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Important Notice</h3>
                <p className="text-yellow-800 font-opensans">
                  All cancellations must be notified in writing via email to <a href="mailto:cancellations@tripskyway.com" className="underline">cancellations@tripskyway.com</a>. Cancellation charges are calculated from the date we receive your written cancellation request.
                </p>
              </div>
            </div>
          </div>

          {/* General Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-4">1. General Cancellation Terms</h2>
            <p className="text-gray-700 leading-relaxed font-opensans mb-4">
              Cancellation charges vary depending on the time of cancellation relative to the departure date, the type of package, and the policies of individual service providers (airlines, hotels, etc.).
            </p>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Clock className="mr-2 text-blue-500" size={20} />
                Standard Cancellation Timeline
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-700 font-opensans">60+ days before departure</span>
                  <span className="font-semibold text-green-600">10% cancellation fee</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-700 font-opensans">45-59 days before departure</span>
                  <span className="font-semibold text-yellow-600">25% cancellation fee</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-700 font-opensans">30-44 days before departure</span>
                  <span className="font-semibold text-orange-600">50% cancellation fee</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-700 font-opensans">15-29 days before departure</span>
                  <span className="font-semibold text-red-600">75% cancellation fee</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-opensans">Less than 15 days / No-show</span>
                  <span className="font-semibold text-red-700">100% cancellation fee (No refund)</span>
                </div>
              </div>
            </div>
          </section>

          {/* Package-Specific */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-4">2. Package-Specific Policies</h2>
            
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">International Packages</h3>
                <p className="text-gray-700 font-opensans">
                  International packages typically have stricter cancellation policies due to visa processing, international flight tickets, and advance hotel bookings. Visa fees are generally non-refundable.
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Domestic Packages</h3>
                <p className="text-gray-700 font-opensans">
                  Domestic packages may offer more flexibility, but cancellation charges still apply based on the timeline above. Some destinations during peak season may have higher cancellation fees.
                </p>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Customized Packages</h3>
                <p className="text-gray-700 font-opensans">
                  Customized or tailor-made packages may have different cancellation terms based on the specific services booked. These will be clearly communicated at the time of booking.
                </p>
              </div>
            </div>
          </section>

          {/* Component-Specific */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-4">3. Service-Specific Cancellation Terms</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">✈️ Flights</h4>
                <p className="text-sm text-gray-700 font-opensans">
                  Subject to airline cancellation policies. Most economy tickets are non-refundable. Airline cancellation/rebooking fees apply separately.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">🏨 Hotels</h4>
                <p className="text-sm text-gray-700 font-opensans">
                  Hotel cancellation policies vary. Some hotels offer free cancellation up to 24-48 hours before check-in; others may be non-refundable.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">🎫 Visas</h4>
                <p className="text-sm text-gray-700 font-opensans">
                  Visa processing fees and embassy charges are non-refundable once the application has been submitted.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">🚌 Transfers</h4>
                <p className="text-sm text-gray-700 font-opensans">
                  Airport transfers and local transportation can usually be cancelled with minimal charges if notified in advance.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">🎭 Activities</h4>
                <p className="text-sm text-gray-700 font-opensans">
                  Tours, excursions, and special events may have specific cancellation deadlines. Some experiences are non-refundable.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">🛡️ Insurance</h4>
                <p className="text-sm text-gray-700 font-opensans">
                  Travel insurance premiums are typically non-refundable once the policy is issued.
                </p>
              </div>
            </div>
          </section>

          {/* Refund Process */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-4">4. Refund Process</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <DollarSign className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Refund Timeline</h4>
                  <p className="text-gray-700 font-opensans">
                    Refunds are processed within 7-14 business days after receiving all cancellation confirmations from service providers. Complex bookings may take up to 30 days.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <DollarSign className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Refund Method</h4>
                  <p className="text-gray-700 font-opensans">
                    Refunds are credited to the original payment method (credit card, bank account, etc.). Bank processing times may add 3-5 additional days.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <DollarSign className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Partial Refunds</h4>
                  <p className="text-gray-700 font-opensans">
                    If you have used some services (e.g., completed first few days of trip), refunds will be calculated for unused portions only, minus applicable cancellation fees.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Modifications */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-4">5. Modifications & Rescheduling</h2>
            <p className="text-gray-700 leading-relaxed font-opensans mb-4">
              Want to change your travel dates instead of cancelling? We offer modification services:
            </p>
            <ul className="list-disc ml-6 space-y-2 text-gray-700 font-opensans">
              <li>Date changes requested 60+ days in advance: Minimal rescheduling fee (approx. 10-15% of package cost)</li>
              <li>Date changes within 30-59 days: Higher rescheduling fees + difference in service costs</li>
              <li>Date changes within 30 days: Subject to availability and supplier policies</li>
              <li>Name changes: Usually allowed up to 30 days before departure (airline fees apply)</li>
            </ul>
            <div className="bg-blue-50 p-4 rounded-lg mt-4">
              <p className="text-sm text-blue-900 font-opensans">
                <strong>Tip:</strong> Modifications are often more cost-effective than cancellations. Contact us to explore options!
              </p>
            </div>
          </section>

          {/* Force Majeure */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-4">6. Force Majeure & Special Circumstances</h2>
            <p className="text-gray-700 leading-relaxed font-opensans mb-3">
              In cases of force majeure (natural disasters, pandemics, war, terrorism, government restrictions), standard cancellation policies may not apply. Possible scenarios:
            </p>
            <ul className="list-disc ml-6 space-y-2 text-gray-700 font-opensans">
              <li><strong>Travel restrictions imposed by government:</strong> We will work with suppliers to reschedule or provide credit vouchers</li>
              <li><strong>Natural disasters at destination:</strong> Options for alternate destinations or rescheduling</li>
              <li><strong>Medical emergencies:</strong> Reduced cancellation fees with valid medical documentation</li>
              <li><strong>Supplier bankruptcy:</strong> We will assist in recovery efforts but cannot guarantee full refunds</li>
            </ul>
            <p className="text-gray-700 font-opensans mt-3">
              We strongly recommend purchasing comprehensive travel insurance that covers trip cancellations, interruptions, and unforeseen events.
            </p>
          </section>

          {/* How to Cancel */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-4">7. How to Submit a Cancellation Request</h2>
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
              <ol className="space-y-3 text-gray-800 font-opensans">
                <li className="flex items-start">
                  <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">1</span>
                  <span>Send an email to <a href="mailto:cancellations@tripskyway.com" className="text-red-700 underline font-semibold">cancellations@tripskyway.com</a></span>
                </li>
                <li className="flex items-start">
                  <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">2</span>
                  <span>Include your booking reference number, full name, and travel dates</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">3</span>
                  <span>Clearly state your reason for cancellation</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">4</span>
                  <span>We will acknowledge your request within 24 hours and provide a cancellation breakdown</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">5</span>
                  <span>Refund will be processed after receiving supplier confirmations</span>
                </li>
              </ol>
            </div>
          </section>

          {/* Contact */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-3">8. Questions?</h2>
            <p className="text-gray-700 font-opensans mb-4">
              For any questions about our cancellation policy or to discuss your specific situation:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-900 font-semibold">Trip Sky Way - Cancellations Department</p>
              <p className="text-gray-700 font-opensans">Email: cancellations@tripskyway.com</p>
              <p className="text-gray-700 font-opensans">Phone: +91 98765 43210</p>
              <p className="text-gray-700 font-opensans">Hours: Monday-Saturday, 10:00 AM - 7:00 PM IST</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicy;
