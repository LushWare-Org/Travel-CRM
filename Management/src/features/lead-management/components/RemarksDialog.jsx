import { X } from 'lucide-react';

const RemarksDialog = ({ isOpen, onClose, lead }) => {
  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Remarks - {lead.name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {lead.remarks?.length || 0} total remarks
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group"
          >
            <X className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors duration-200" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {lead.remarks && lead.remarks.length > 0 ? (
            lead.remarks.map((remark, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-900 mb-2">{remark.text}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {remark.date ? new Date(remark.date).toLocaleDateString() : 'No date'}
                  </span>
                  <span className="text-xs font-medium text-gray-600">
                    Remark #{index + 1}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No remarks available</p>
              <p className="text-sm mt-2">No remarks have been added to this lead yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RemarksDialog;

