import { useState } from 'react';
import { CareerContainer, VacanciesContainer } from '../features/career';
import { Briefcase, Users } from 'lucide-react';

const CareerManagement = () => {
  const [activeTab, setActiveTab] = useState('applications');

  const tabs = [
    { id: 'applications', label: 'Applications', icon: Users },
    { id: 'vacancies', label: 'Vacancies', icon: Briefcase },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 shadow-sm">
        <div className="flex gap-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-4 flex items-center gap-2 font-medium transition border-b-2 ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'vacancies' && <VacanciesContainer />}
        {activeTab === 'applications' && <CareerContainer />}
      </div>
    </div>
  );
};

export default CareerManagement;
