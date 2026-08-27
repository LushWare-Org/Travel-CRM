import { ArrowRight, Loader } from 'lucide-react';
import type { Vacancy } from '../CareerContainer';

interface VacancyListProps {
  vacancies: Vacancy[];
  loading: boolean;
  /** Called with the position label when the user clicks "Apply Now". */
  onApply: (position: string) => void;
}

const VacancyList = ({ vacancies, loading, onApply }: VacancyListProps) => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-10">Open Positions</h2>
        {loading ? (
          <div className="text-center py-8">
            <Loader className="w-8 h-8 animate-spin mx-auto text-brand-600" />
            <p className="text-gray-600 mt-2">Loading positions...</p>
          </div>
        ) : vacancies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vacancies.map((job) => (
              <div
                key={job.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{job.position}</h3>
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <p>{job.type}</p>
                  <p>{job.location}</p>
                  {job.experienceMin !== undefined && (
                    <p>{job.experienceMin}+ years experience</p>
                  )}
                </div>
                <a
                  href="#apply-form"
                  onClick={(e) => {
                    e.preventDefault();
                    onApply(job.position);
                  }}
                  className="text-brand-600 font-medium text-sm hover:text-brand-700 transition-colors flex items-center gap-2"
                >
                  Apply Now <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No open positions available at the moment.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default VacancyList;
