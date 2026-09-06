import { ChevronDown } from 'lucide-react';
import { FAQ_CATEGORIES, FAQS } from '../../../content/faq';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FAQSection() {
  const [activeCategory, setActiveCategory] = useState<keyof typeof FAQS>('booking');
  const [openQuestions, setOpenQuestions] = useState<Record<number, boolean>>({});

  const toggleQuestion = (questionIndex: number) => {
    setOpenQuestions(prev => ({
      ...prev,
      [questionIndex]: !prev[questionIndex]
    }));
  };

  return (
    <section className="relative overflow-hidden bg-white pb-section-lg pt-4 font-body">
      <div className="relative z-raised mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-display text-3xl font-bold text-gray-900 md:text-4xl">
            Got Questions? We've Got Answers
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600">
            Helpful answers to make your holiday planning easy and confident
          </p>
        </div>

        {/* Category tabs — shadcn Tabs line variant (see DESIGN.md). */}
        <Tabs
          value={activeCategory}
          onValueChange={(value) => {
            setActiveCategory(value as keyof typeof FAQS);
            setOpenQuestions({});
          }}
          className="mb-12 flex flex-col items-center"
        >
          <TabsList
            variant="line"
            className="mx-auto flex h-auto w-full max-w-3xl flex-wrap items-center justify-center gap-x-1 gap-y-3 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto"
          >
            {FAQ_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="h-10 gap-2 rounded-md px-4 text-sm font-semibold text-gray-600 transition-colors duration-300 hover:text-gray-900 data-active:text-brand-700 after:bg-brand-600 sm:px-5"
                >
                  <Icon className="size-4" />
                  <span>{category.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* FAQ Accordion — expand/collapse list; shadcn ships no Accordion
            primitive today, so the interaction stays a button toggle on Card
            tiles (DESIGN.md: border-elevated, no resting shadow). */}
        <div className="mx-auto max-w-4xl">
          <div className="space-y-4">
            {FAQS[activeCategory].map((faq: { question: string; answer: string }, index: number) => {
              const isOpen = openQuestions[index];
              return (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors duration-300 hover:border-gray-300"
                >
                  <button
                    onClick={() => toggleQuestion(index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between px-6 py-5 text-left"
                  >
                    <span className="pr-8 font-display text-lg font-semibold text-gray-900">
                      {faq.question}
                    </span>
                    <span
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    >
                      <ChevronDown className="size-5" />
                    </span>
                  </button>
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    } overflow-hidden`}
                  >
                    <div className="px-6 pb-6">
                      <div className="border-t border-gray-200 pt-4">
                        <p className="leading-relaxed text-gray-600">
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
