// Per-company marketing content: FAQ categories and questions.

import { CreditCard, Plane, FileText, Wallet } from 'lucide-react';

export const FAQ_CATEGORIES = [
  { id: 'booking', label: 'Booking & Payment', icon: CreditCard, gradient: 'from-blue-500 to-cyan-500' },
  { id: 'travel', label: 'Travel Planning', icon: Plane, gradient: 'from-brand-500 to-brand-accent-500' },
  { id: 'policies', label: 'Policies & Support', icon: FileText, gradient: 'from-purple-500 to-pink-500' },
  { id: 'pricing', label: 'Pricing & Deals', icon: Wallet, gradient: 'from-green-500 to-emerald-500' },
];

export const FAQS = {
  booking: [
    {
      question: 'How do I book a travel package?',
      answer: 'Booking is simple! Browse our destinations or packages, select your preferred option, click "Book Now," fill in your details, and complete the secure payment. You\'ll receive instant confirmation via email with all your trip details.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, Mastercard, American Express), debit cards, bank transfers, and digital wallets like PayPal. All transactions are secured with 256-bit SSL encryption for your safety.'
    },
    {
      question: 'Can I make a partial payment or pay in installments?',
      answer: 'Yes! We offer flexible payment plans. Pay 30% upfront to secure your booking and settle the remaining amount up to 15 days before departure. Installment options are available for bookings over $2000.'
    },
    {
      question: 'Is my booking confirmation immediate?',
      answer: 'Absolutely! Once payment is processed, you\'ll receive instant confirmation via email and SMS. Your booking dashboard will also be updated immediately with all trip documents and itinerary details.'
    },
    {
      question: 'Can I book for someone else?',
      answer: 'Yes, you can book travel packages for family or friends. Simply enter their details during checkout. The primary traveler will receive all confirmations and travel documents at the email provided.'
    }
  ],
  travel: [
    {
      question: 'Can I customize my itinerary?',
      answer: 'Absolutely! Every package can be tailored to your preferences. Add extra days, change hotels, include special activities, or adjust the pace. Our travel experts work with you to create your perfect journey.'
    },
    {
      question: 'Do you provide travel insurance?',
      answer: 'Yes, we highly recommend travel insurance and offer comprehensive coverage options including trip cancellation, medical emergencies, lost baggage, and flight delays. Insurance can be added during checkout.'
    },
    {
      question: 'What documents do I need for international travel?',
      answer: 'You\'ll need a valid passport (with 6+ months validity), visa (if required), travel insurance, and vaccination certificates where applicable. We provide detailed document checklists for each destination upon booking.'
    },
    {
      question: 'Do you arrange airport transfers?',
      answer: 'Yes! All our packages include airport pickup and drop-off services. You\'ll be greeted by our representative with a nameplate and escorted to your hotel in comfortable, air-conditioned vehicles.'
    },
    {
      question: 'Are meals included in the packages?',
      answer: 'Meal inclusions vary by package. Most include daily breakfast, and premium packages offer half-board or full-board options. All meal details are clearly mentioned in the package description.'
    }
  ],
  policies: [
    {
      question: 'What is your cancellation policy?',
      answer: 'Cancellations made 30+ days before departure receive 90% refund, 15-29 days get 50% refund, and within 14 days are non-refundable. However, you can reschedule free of charge once within the validity period.'
    },
    {
      question: 'Can I change my travel dates after booking?',
      answer: 'Yes! Date changes are allowed subject to availability. Changes made 30+ days before departure are free, while later changes may incur a fee depending on airline and hotel policies.'
    },
    {
      question: 'What if I need assistance during my trip?',
      answer: 'We provide 24/7 on-trip support! You\'ll have dedicated emergency contact numbers, local ground support teams, and a personal travel concierge available round-the-clock to assist with any concerns.'
    },
    {
      question: 'Do you offer group discounts?',
      answer: 'Yes! Groups of 6+ travelers receive special discounts starting from 10%. Corporate groups, wedding parties, and student groups get customized packages with additional benefits and flexible terms.'
    },
    {
      question: 'What happens if my flight is delayed or cancelled?',
      answer: 'Our team monitors all bookings in real-time. If there are flight disruptions, we immediately assist with rebooking, hotel arrangements, and itinerary adjustments. Travel insurance covers most delay-related expenses.'
    }
  ],
  pricing: [
    {
      question: 'Are there any hidden costs?',
      answer: 'No hidden charges ever! Our prices are all-inclusive with transparent breakdowns. The only additional costs would be personal expenses, optional activities not in the itinerary, and visa fees (if applicable).'
    },
    {
      question: 'Do you price match with competitors?',
      answer: 'Yes! We offer a Best Price Guarantee. If you find the same package cheaper elsewhere within 24 hours of booking, we\'ll match the price and give you an additional 5% discount.'
    },
    {
      question: 'How often do you offer special deals?',
      answer: 'We have special promotions monthly! Subscribe to our newsletter for flash sales, seasonal discounts, early bird offers, and exclusive member deals. Major sales happen during festive seasons and off-peak periods.'
    },
    {
      question: 'Are taxes and fees included in the price?',
      answer: 'Yes! All displayed prices include applicable taxes, service fees, and government charges. The price you see is the price you pay, with no surprises at checkout.'
    },
    {
      question: 'Can I get a discount for last-minute bookings?',
      answer: 'Yes! We often have last-minute deals (departures within 15 days) with discounts up to 30%. Check our "Deal of the Month" section or contact our team for current last-minute offers.'
    }
  ]
};
