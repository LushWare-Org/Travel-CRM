import { ChevronDown } from 'lucide-react';
import { FAQ_CATEGORIES, FAQS } from '../../content/faq';
import { useState } from 'react';

export default function FAQSection() {
  const [activeCategory, setActiveCategory] = useState('booking');
  const [openQuestions, setOpenQuestions] = useState({});

  const toggleQuestion = (questionIndex) => {
    setOpenQuestions(prev => ({
      ...prev,
      [questionIndex]: !prev[questionIndex]
    }));
  };

  return (
    <section className="py-4 bg-white relative overflow-hidden font-opensans pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
          <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-poppins">
            Got Questions? We've Got Answers
          </h2>
          <p className="text-lg text-gray-600">
            Helpful answers to make your holiday planning easy and confident
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {FAQ_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => {
                  setActiveCategory(category.id);
                  setOpenQuestions({});
                }}
                className={`group relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${
                  activeCategory === category.id
                    ? 'bg-gradient-to-r from-brand-600 to-brand-accent-500 text-white shadow-lg transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg border border-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {FAQS[activeCategory].map((faq, index) => {
              const isOpen = openQuestions[index];
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => toggleQuestion(index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors duration-200"
                  >
                    <span className="text-lg font-semibold text-gray-900 pr-8 font-poppins">
                      {faq.question}
                    </span>
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-accent-500 flex items-center justify-center transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    >
                      <ChevronDown className="w-5 h-5 text-white" />
                    </div>
                  </button>
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    } overflow-hidden`}
                  >
                    <div className="px-6 pb-6">
                      <div className="pt-2 pb-2 border-t border-gray-200">
                        <p className="text-gray-600 leading-relaxed font-opensans">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
    </section>
  );
}