import React from 'react';
import { FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen px-4 py-12 bg-gray-50 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto overflow-hidden bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-8 py-12 text-white bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center justify-center mb-4">
            <FileText size={48} className="mr-4" />
            <h1 className="text-4xl font-bold font-poppins">Terms of Service</h1>
          </div>
          <p className="text-center text-blue-100 font-opensans">
            Please read these terms carefully before using our services.
          </p>
          <p className="mt-4 text-sm text-center text-blue-100">
            Last updated: December 23, 2025
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-10 space-y-8">
          {/* Agreement */}
          <section>
            <h2 className="mb-3 text-2xl font-semibold text-gray-900 font-poppins">1. Agreement to Terms</h2>
            <p className="leading-relaxed text-gray-700 font-opensans">
              By accessing and using Trip Sky Way's website and services, you accept and agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access our services.
            </p>
          </section>

          {/* Services */}
          <section className="pt-8 border-t border-gray-200">
            <h2 className="mb-3 text-2xl font-semibold text-gray-900 font-poppins">2. Services Provided</h2>
            <p className="mb-3 leading-relaxed text-gray-700 font-opensans">
              Trip Sky Way provides travel planning and booking services including:
            </p>
            <ul className="ml-6 space-y-2 text-gray-700 list-disc font-opensans">
              <li>International and domestic tour packages</li>
              <li>Hotel and accommodation bookings</li>
              <li>Flight ticket arrangements</li>
              <li>Visa assistance and travel documentation support</li>
              <li>Customized itinerary planning</li>
              <li>Travel insurance coordination</li>
            </ul>
          </section>

          {/* Booking Terms */}
          <section className="pt-8 border-t border-gray-200">
            <h2 className="mb-3 text-2xl font-semibold text-gray-900 font-poppins">3. Booking & Payment Terms</h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-lg font-semibold text-gray-800">Booking Confirmation</h3>
                <p className="text-gray-700 font-opensans">
                  A booking is confirmed only upon receipt of the required deposit or full payment and issuance of a booking confirmation from Trip Sky Way.
                </p>
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-gray-800">Payment Schedule</h3>
                <ul className="ml-6 space-y-1 text-gray-700 list-disc font-opensans">
                  <li>Deposit: 30-50% at the time of booking (varies by package)</li>
                  <li>Balance: Due 30 days before departure</li>
                  <li>Late bookings (within 30 days): Full payment required immediately</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-gray-800">Accepted Payment Methods</h3>
                <p className="text-gray-700 font-opensans">
                  We accept credit cards, debit cards, bank transfers, UPI, and other digital payment methods. All prices are quoted in USD or INR.
                </p>
              </div>
            </div>
          </section>

          {/* Cancellation */}
          <section className="pt-8 border-t border-gray-200">
            <h2 className="mb-3 text-2xl font-semibold text-gray-900 font-poppins">4. Cancellation & Refund Policy</h2>
            <p className="mb-3 leading-relaxed text-gray-700 font-opensans">
              Please refer to our separate <a href="/cancellation-policy" className="text-blue-600 hover:underline">Cancellation Policy</a> for detailed information. General terms include:
            </p>
            <ul className="ml-6 space-y-2 text-gray-700 list-disc font-opensans">
              <li>Cancellations must be made in writing via email</li>
              <li>Refund amounts depend on the cancellation timeline</li>
              <li>Some components may be non-refundable (flights, special events)</li>
              <li>Processing time: 7-14 business days</li>
            </ul>
          </section>

          {/* Travel Documents */}
          <section className="pt-8 border-t border-gray-200">
            <h2 className="mb-3 text-2xl font-semibold text-gray-900 font-poppins">5. Travel Documents & Visa</h2>
            <div className="p-4 mb-4 border-l-4 border-yellow-500 bg-yellow-50">
              <p className="text-yellow-900 font-opensans">
                <strong>Important:</strong> It is the traveler's responsibility to ensure all travel documents are valid and in order.
              </p>
            </div>
            <ul className="ml-6 space-y-2 text-gray-700 list-disc font-opensans">
              <li>Valid passport (minimum 6 months validity from return date)</li>
              <li>Necessary visas for destination countries</li>
              <li>Travel insurance (highly recommended)</li>
              <li>Health certificates and vaccination records (if required)</li>
            </ul>
            <p className="mt-3 text-gray-700 font-opensans">
              While we provide visa assistance, Trip Sky Way is not responsible for visa rejections or delays.
            </p>
          </section>

          {/* Liability */}
          <section className="pt-8 border-t border-gray-200">
            <h2 className="mb-3 text-2xl font-semibold text-gray-900 font-poppins">6. Limitation of Liability</h2>
            <p className="mb-3 leading-relaxed text-gray-700 font-opensans">
              Trip Sky Way acts as an intermediary between travelers and service providers. We are not liable for:
            </p>
            <ul className="ml-6 space-y-2 text-gray-700 list-disc font-opensans">
              <li>Flight delays, cancellations, or schedule changes by airlines</li>
              <li>Hotel overbooking or service quality issues</li>
              <li>Loss, damage, or theft of personal belongings</li>
              <li>Medical emergencies or health issues during travel</li>
              <li>Natural disasters, political unrest, or force majeure events</li>
              <li>Third-party service provider failures or defaults</li>
            </ul>
            <p className="mt-3 text-gray-700 font-opensans">
              We strongly recommend purchasing comprehensive travel insurance to cover such incidents.
            </p>
          </section>

          {/* User Conduct */}
          <section className="pt-8 border-t border-gray-200">
            <h2 className="mb-3 text-2xl font-semibold text-gray-900 font-poppins">7. User Conduct</h2>
            <p className="mb-3 leading-relaxed text-gray-700 font-opensans">
              Users agree to:
            </p>
            <div className="space-y-2">
              <div className="flex items-start">
                <CheckCircle className="flex-shrink-0 mt-1 mr-2 text-green-500" size={20} />
                <p className="text-gray-700 font-opensans">Provide accurate and complete information</p>
              </div>
              <div className="flex items-start">
                <CheckCircle className="flex-shrink-0 mt-1 mr-2 text-green-500" size={20} />
                <p className="text-gray-700 font-opensans">Respect local laws and customs at destinations</p>
              </div>
              <div className="flex items-start">
                <CheckCircle className="flex-shrink-0 mt-1 mr-2 text-green-500" size={20} />
                <p className="text-gray-700 font-opensans">Behave respectfully with service providers and fellow travelers</p>
              </div>
              <div className="flex items-start">
                <XCircle className="flex-shrink-0 mt-1 mr-2 text-red-500" size={20} />
                <p className="text-gray-700 font-opensans">Not engage in illegal activities or misuse services</p>
              </div>
              <div className="flex items-start">
                <XCircle className="flex-shrink-0 mt-1 mr-2 text-red-500" size={20} />
                <p className="text-gray-700 font-opensans">Not provide false information or fraudulent payment details</p>
              </div>
            </div>
          </section>

          {/* Changes to Services */}
          <section className="pt-8 border-t border-gray-200">
            <h2 className="mb-3 text-2xl font-semibold text-gray-900 font-poppins">8. Changes to Services</h2>
            <p className="leading-relaxed text-gray-700 font-opensans">
              Trip Sky Way reserves the right to modify or discontinue services without prior notice. We will make reasonable efforts to notify affected customers. Prices are subject to change based on availability and market conditions.
            </p>
          </section>

          {/* Intellectual Property */}
          <section className="pt-8 border-t border-gray-200">
            <h2 className="mb-3 text-2xl font-semibold text-gray-900 font-poppins">9. Intellectual Property</h2>
            <p className="leading-relaxed text-gray-700 font-opensans">
              All content on this website, including text, graphics, logos, images, and software, is the property of Trip Sky Way and protected by copyright laws. Unauthorized use is prohibited.
            </p>
          </section>

          {/* Dispute Resolution */}
          <section className="pt-8 border-t border-gray-200">
            <h2 className="mb-3 text-2xl font-semibold text-gray-900 font-poppins">10. Dispute Resolution</h2>
            <p className="leading-relaxed text-gray-700 font-opensans">
              Any disputes arising from these terms will be governed by the laws of India. Disputes will be resolved through mediation or arbitration in New Delhi before resorting to legal proceedings.
            </p>
          </section>

          {/* Contact */}
          <section className="pt-8 border-t border-gray-200">
            <h2 className="mb-3 text-2xl font-semibold text-gray-900 font-poppins">11. Contact Information</h2>
            <p className="mb-4 text-gray-700 font-opensans">
              For questions about these Terms of Service, contact:
            </p>
            <div className="p-4 rounded-lg bg-blue-50">
              <p className="font-semibold text-gray-900">Trip Sky Way</p>
              <p className="text-gray-700 font-opensans">Email: info@tripskyway.com</p>
              <p className="text-gray-700 font-opensans">Phone: +91 98765 43210</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
