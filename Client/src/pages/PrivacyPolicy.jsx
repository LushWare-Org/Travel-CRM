import React from 'react';
import { Shield, Lock, Eye, FileText, Mail, Phone, MapPin } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-8 py-12 text-white">
          <div className="flex items-center justify-center mb-4">
            <Shield size={48} className="mr-4" />
            <h1 className="text-4xl font-bold font-poppins">Privacy Policy</h1>
          </div>
          <p className="text-center text-yellow-100 font-opensans">
            Your privacy is important to us. Learn how we protect your personal information.
          </p>
          <p className="text-center text-sm mt-4 text-yellow-100">
            Last updated: December 23, 2025
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-10 space-y-8">
          {/* Introduction */}
          <section>
            <div className="flex items-start mb-4">
              <FileText className="text-yellow-500 mr-3 mt-1" size={24} />
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-3">Introduction</h2>
                <p className="text-gray-700 leading-relaxed font-opensans">
                  Welcome to Trip Sky Way. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, use our services, or submit inquiries through our lead forms on Facebook, Instagram, or other platforms.
                </p>
                <p className="text-gray-700 leading-relaxed font-opensans mt-3">
                  By using our services, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
                </p>
              </div>
            </div>
          </section>

          {/* Information We Collect */}
          <section className="border-t border-gray-200 pt-8">
            <div className="flex items-start mb-4">
              <Eye className="text-yellow-500 mr-3 mt-1" size={24} />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-3">1. Information We Collect</h2>
                
                <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-4">Personal Information</h3>
                <p className="text-gray-700 leading-relaxed font-opensans mb-3">
                  When you submit a lead form through Facebook, Instagram, our website, or contact us directly, we may collect:
                </p>
                <ul className="list-disc ml-6 space-y-2 text-gray-700 font-opensans">
                  <li>Full name</li>
                  <li>Email address</li>
                  <li>Phone number</li>
                  <li>Travel destination preferences</li>
                  <li>Travel dates and duration</li>
                  <li>Number of travelers</li>
                  <li>Budget range</li>
                  <li>Special requests and requirements</li>
                  <li>Trip type (honeymoon, family vacation, etc.)</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-6">Automatically Collected Information</h3>
                <p className="text-gray-700 leading-relaxed font-opensans mb-3">
                  When you visit our website, we automatically collect:
                </p>
                <ul className="list-disc ml-6 space-y-2 text-gray-700 font-opensans">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Pages viewed and time spent on pages</li>
                  <li>Referring website or source</li>
                  <li>Geographic location data</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-6">Social Media Information</h3>
                <p className="text-gray-700 leading-relaxed font-opensans">
                  When you submit a lead form through Facebook or Instagram, we receive information pre-filled from your social media profile, which may include your public profile information as permitted by the platform.
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="border-t border-gray-200 pt-8">
            <div className="flex items-start mb-4">
              <Lock className="text-yellow-500 mr-3 mt-1" size={24} />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-3">2. How We Use Your Information</h2>
                <p className="text-gray-700 leading-relaxed font-opensans mb-3">
                  We use your information for the following purposes:
                </p>
                <ul className="list-disc ml-6 space-y-2 text-gray-700 font-opensans">
                  <li><strong>Provide Services:</strong> To create personalized travel itineraries and quotes based on your preferences</li>
                  <li><strong>Communication:</strong> To contact you regarding your travel inquiry via phone, email, or messaging apps</li>
                  <li><strong>Marketing:</strong> To send relevant travel packages, special offers, and promotional materials (you can opt-out anytime)</li>
                  <li><strong>Customer Service:</strong> To respond to your questions, requests, and provide support</li>
                  <li><strong>Booking Management:</strong> To process and manage your travel bookings, payments, and reservations</li>
                  <li><strong>Improvement:</strong> To analyze usage patterns and improve our services, website, and customer experience</li>
                  <li><strong>Legal Compliance:</strong> To comply with legal obligations and enforce our terms of service</li>
                  <li><strong>Safety & Security:</strong> To protect against fraud, unauthorized access, and other illegal activities</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Sharing */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-3">3. How We Share Your Information</h2>
            <p className="text-gray-700 leading-relaxed font-opensans mb-3">
              We do not sell or rent your personal information. We may share your information with:
            </p>
            <ul className="list-disc ml-6 space-y-2 text-gray-700 font-opensans">
              <li><strong>Service Providers:</strong> Hotels, airlines, tour operators, and travel partners necessary to fulfill your booking</li>
              <li><strong>Payment Processors:</strong> Third-party payment gateways to process transactions securely</li>
              <li><strong>Business Partners:</strong> Trusted partners who help us operate our business (e.g., CRM systems, email services)</li>
              <li><strong>Legal Authorities:</strong> When required by law, court order, or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
            <p className="text-gray-700 leading-relaxed font-opensans mt-3">
              All third parties are obligated to protect your information and use it only for the specified purposes.
            </p>
          </section>

          {/* Data Security */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-3">4. Data Storage & Security</h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="text-blue-900 font-opensans">
                <strong>Security Measures:</strong> We implement industry-standard security measures to protect your data.
              </p>
            </div>
            <ul className="list-disc ml-6 space-y-2 text-gray-700 font-opensans">
              <li>Encryption of sensitive data during transmission (SSL/TLS)</li>
              <li>Secure servers with firewall protection</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication for authorized personnel only</li>
              <li>Data backup and disaster recovery procedures</li>
            </ul>
            <p className="text-gray-700 leading-relaxed font-opensans mt-4">
              <strong>Data Retention:</strong> We retain your information for as long as necessary to provide services and comply with legal obligations. Facebook/Instagram lead form data is stored in our database and retained for a minimum of 90 days or until you request deletion.
            </p>
          </section>

          {/* Your Rights */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-3">5. Your Rights</h2>
            <p className="text-gray-700 leading-relaxed font-opensans mb-3">
              You have the following rights regarding your personal information:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Access</h4>
                <p className="text-sm text-gray-700">Request a copy of your personal data we hold</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Correction</h4>
                <p className="text-sm text-gray-700">Request correction of inaccurate data</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Deletion</h4>
                <p className="text-sm text-gray-700">Request deletion of your data (right to be forgotten)</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Opt-Out</h4>
                <p className="text-sm text-gray-700">Unsubscribe from marketing communications</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Portability</h4>
                <p className="text-sm text-gray-700">Request data in a portable format</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Complaint</h4>
                <p className="text-sm text-gray-700">File a complaint with data protection authorities</p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed font-opensans mt-4">
              To exercise any of these rights, please contact us using the information provided below.
            </p>
          </section>

          {/* Cookies */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-3">6. Cookies & Tracking Technologies</h2>
            <p className="text-gray-700 leading-relaxed font-opensans mb-3">
              We use cookies and similar tracking technologies to enhance your browsing experience:
            </p>
            <ul className="list-disc ml-6 space-y-2 text-gray-700 font-opensans">
              <li><strong>Essential Cookies:</strong> Required for website functionality (e.g., login sessions)</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site (Google Analytics)</li>
              <li><strong>Marketing Cookies:</strong> Track your visits to show relevant ads (Facebook Pixel, Google Ads)</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-gray-700 leading-relaxed font-opensans mt-3">
              You can control cookies through your browser settings. However, disabling cookies may affect website functionality.
            </p>
          </section>

          {/* Third-Party Links */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-3">7. Third-Party Links & Services</h2>
            <p className="text-gray-700 leading-relaxed font-opensans">
              Our website may contain links to third-party websites (hotels, airlines, attractions). We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal information.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-3">8. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed font-opensans">
              Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          {/* International Transfers */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-3">9. International Data Transfers</h2>
            <p className="text-gray-700 leading-relaxed font-opensans">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with this privacy policy and applicable laws.
            </p>
          </section>

          {/* Updates to Policy */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-3">10. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed font-opensans">
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. We encourage you to review this policy periodically. Continued use of our services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact Information */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 font-poppins mb-4">11. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed font-opensans mb-6">
              If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
            </p>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 font-poppins">Trip Sky Way</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <MapPin className="text-yellow-600 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700 font-opensans">
                    2/73, near Gurudwara, Lalita Park,<br />
                    Laxmi Nagar, New Delhi, Delhi, 110092
                  </p>
                </div>
                <div className="flex items-center">
                  <Phone className="text-yellow-600 mr-3 flex-shrink-0" size={20} />
                  <a href="tel:+919876543210" className="text-gray-700 hover:text-yellow-600 transition font-opensans">
                    +91 98765 43210
                  </a>
                </div>
                <div className="flex items-center">
                  <Mail className="text-yellow-600 mr-3 flex-shrink-0" size={20} />
                  <a href="mailto:privacy@tripskyway.com" className="text-gray-700 hover:text-yellow-600 transition font-opensans">
                    privacy@tripskyway.com
                  </a>
                </div>
                <div className="flex items-center">
                  <Mail className="text-yellow-600 mr-3 flex-shrink-0" size={20} />
                  <a href="mailto:info@tripskyway.com" className="text-gray-700 hover:text-yellow-600 transition font-opensans">
                    info@tripskyway.com
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4">
              <p className="text-sm text-blue-900 font-opensans">
                <strong>For Data Protection Requests:</strong> Please include "Privacy Request" in the subject line and provide sufficient details to help us locate your information in our systems.
              </p>
            </div>
          </section>

          {/* Consent */}
          <section className="border-t border-gray-200 pt-8">
            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-2 font-poppins">Your Consent</h3>
              <p className="text-green-800 font-opensans">
                By using our website, submitting lead forms, or engaging with our services, you consent to this Privacy Policy and agree to its terms. If you do not agree, please discontinue use of our services.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
