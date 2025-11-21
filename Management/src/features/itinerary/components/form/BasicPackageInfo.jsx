/**
 * Basic Package Info Form Component
 * Handles package name, description, category, destination, highlights, inclusions, and exclusions
 */

import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { CATEGORY_OPTIONS } from '../../utils/constants';
import DestinationSelector from '../DestinationSelector';
import packageAIApi from '../../../../services/packageAIApi';

const BasicPackageInfo = ({ formData, onChange, packageId = null }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(null); // null = not checked, true/false = status
  const debounceTimerRef = useRef(null);

  // Check AI status on mount
  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
        const token = localStorage.getItem('token');
        
        if (!token) {
          setAiConfigured(false);
          return;
        }

        const response = await fetch(`${apiBaseUrl}/packages/ai-status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          // If 401/403, user not authenticated - don't show error
          if (response.status === 401 || response.status === 403) {
            setAiConfigured(null); // Don't know status
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        // Check if AI is configured AND models are available
        setAiConfigured(data.configured === true && data.keyFormat === 'valid');
      } catch (error) {
        console.error('Error checking AI status:', error);
        // Don't set to false on error - might be auth issue
        setAiConfigured(null);
      }
    };
    checkAIStatus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...formData, [name]: value });
  };

  const handleArrayFieldChange = (name, value) => {
    // Store as string while typing, convert to array on blur
    onChange({ ...formData, [name]: value });
  };

  const handleArrayFieldBlur = (name, value) => {
    // Convert comma-separated string to array when field loses focus
    const arrayValue = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    onChange({ ...formData, [name]: arrayValue });
  };

  const getArrayFieldValue = (fieldName) => {
    const value = formData[fieldName];
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value || '';
  };

  const generateAIContent = async (title) => {
    if (!title || title.trim() === '') {
      return;
    }

    // Check if user is authenticated before making request
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to use AI features');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await packageAIApi.generateFromTitle({
        title: title.trim(),
        destination: formData.destination || null,
        duration: formData.duration || null,
        category: formData.category || null,
      });
      
      if (response.success && response.data) {
        const aiContent = response.data;
        
        // Update form with AI-generated content
        onChange({
          ...formData,
          description: aiContent.description || formData.description,
          highlights: aiContent.highlights || formData.highlights,
          inclusions: aiContent.inclusions || formData.inclusions,
          exclusions: aiContent.exclusions || formData.exclusions,
        });
        
        if (!autoGenerateEnabled) {
          toast.success('AI content generated and applied successfully!');
        }
      } else {
        if (!autoGenerateEnabled) {
          toast.error(response.message || 'Failed to generate AI content');
        }
      }
    } catch (error) {
      console.error('Error generating AI content:', error);
      console.error('Error details:', {
        status: error.status,
        statusCode: error.statusCode,
        message: error.message,
        data: error.data,
        isNetworkError: error.isNetworkError,
      });
      
      // Check if it's a network/connection error
      if (error.isNetworkError || error.status === 0 || error.message.includes('Cannot connect to server') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        toast.error('Cannot connect to server. Please make sure the server is running on port 5000.');
        return;
      }
      
      // Check if it's an authentication error (401)
      if (error.status === 401 || error.statusCode === 401) {
        const errorMessage = error.data?.message || error.message || 'Your session has expired';
        toast.error(`${errorMessage}. Please login again.`);
        return;
      }
      
      // Check if it's a service unavailable error (503) - models not available
      if (error.status === 503 || error.statusCode === 503) {
        const errorMessage = error.data?.error || error.data?.message || error.message;
        if (errorMessage.includes('model not found') || errorMessage.includes('not available')) {
          toast.error('AI models not available. Your API key doesn\'t have access to Gemini models. Please check the API key configuration.', {
            duration: 6000,
          });
          // Update AI status to show it's not working
          setAiConfigured(false);
        } else {
          toast.error(errorMessage || 'AI service is currently unavailable.');
        }
        return;
      }
      
      // Show error message
      if (!autoGenerateEnabled) {
        const errorMessage = error.data?.error || error.data?.message || error.message || 'Failed to generate AI content. Please check your API key.';
        toast.error(errorMessage, {
          duration: 5000,
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!formData.name || formData.name.trim() === '') {
      toast.error('Please enter a package name first');
      return;
    }

    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to use AI features');
      return;
    }

    setAutoGenerateEnabled(false);
    await generateAIContent(formData.name);
  };

  // Auto-generate description when package name changes (with debouncing)
  // DISABLED until API key is properly configured to avoid errors
  // Uncomment below to enable auto-generation once API key is set up
  /*
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only auto-generate if:
    // 1. Package name exists and has at least 5 characters
    // 2. Description is empty or hasn't been manually edited
    if (
      formData.name && 
      formData.name.trim().length >= 5 && 
      (!formData.description || formData.description.trim() === '')
    ) {
      // Debounce: wait 2 seconds after user stops typing
      debounceTimerRef.current = setTimeout(async () => {
        const title = formData.name.trim();
        if (!title) return;

        setIsGenerating(true);
        setAutoGenerateEnabled(true);
        
        try {
          const response = await packageAIApi.generateFromTitle({
            title: title,
            destination: formData.destination || null,
            duration: formData.duration || null,
            category: formData.category || null,
          });
          
          if (response.success && response.data) {
            const aiContent = response.data;
            
            // Update form with AI-generated content
            onChange({
              ...formData,
              description: aiContent.description || formData.description,
              highlights: aiContent.highlights || formData.highlights,
              inclusions: aiContent.inclusions || formData.inclusions,
              exclusions: aiContent.exclusions || formData.exclusions,
            });
          }
        } catch (error) {
          console.error('Error auto-generating AI content:', error);
          // Silently fail for auto-generation
        } finally {
          setIsGenerating(false);
          setAutoGenerateEnabled(false);
        }
      }, 2000);
    }

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.name, formData.description]);
  */

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Package Name <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            placeholder="Package Name (e.g., 7-Day Sri Lanka Adventure)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {formData.name && formData.name.trim().length >= 3 && (
            <button
              type="button"
              onClick={handleAIGenerate}
              disabled={isGenerating || aiConfigured === false}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              title={
                aiConfigured === false 
                  ? "AI not configured. Add GEMINI_API_KEY to Server/.env and restart server."
                  : "Generate description, highlights, inclusions, and exclusions using AI"
              }
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating...' : 'Generate with AI'}
            </button>
          )}
        </div>
        {formData.name && formData.name.trim().length >= 3 && (
          <>
            {aiConfigured === false && (
              <div className="text-xs text-red-600 mt-1 font-medium bg-red-50 p-2 rounded border border-red-200">
                <p className="font-semibold mb-1">⚠️ AI Generation Not Available</p>
                <p className="text-gray-700 font-normal mb-2">
                  Your API key doesn't have access to Gemini models. All models return 404 (not found).
                </p>
                <p className="text-gray-600 font-normal text-xs">
                  <strong>Quick Fix:</strong> Get a NEW API key from{' '}
                  <a 
                    href="https://makersuite.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 underline font-semibold"
                  >
                    AI Studio (makersuite.google.com)
                  </a>
                  {' '}— make sure the URL shows "makersuite", not "console.cloud"
                </p>
                <p className="text-gray-600 font-normal text-xs mt-1">
                  <strong>Alternative:</strong> If using Google Cloud Console, enable{' '}
                  <a 
                    href="https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Generative AI API
                  </a>
                  {' '}and check API key restrictions
                </p>
                <p className="text-gray-500 font-normal text-xs mt-2 italic">
                  💡 You can still create packages manually — AI generation is optional.
                </p>
              </div>
            )}
            {aiConfigured === true && (
              <p className="text-xs text-gray-500 mt-1">
                💡 Click "Generate with AI" to auto-fill description, highlights, inclusions, and exclusions
              </p>
            )}
          </>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          name="description"
          placeholder="Package Description"
          value={formData.description || ''}
          onChange={handleChange}
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            name="category"
            value={formData.category || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Category</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destination <span className="text-red-500">*</span>
          </label>
          <DestinationSelector
            name="destination"
            value={formData.destination || ''}
            onChange={handleChange}
          />
          <p className="text-xs text-gray-500 mt-1">
            Select from popular destinations or type a custom one
          </p>
        </div>
      </div>

      {/* Highlights */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Highlights
        </label>
        <textarea
          name="highlights"
          placeholder="Enter highlights separated by commas (e.g., Free WiFi, Breakfast included, City tour)"
          value={getArrayFieldValue('highlights')}
          onChange={(e) => handleArrayFieldChange('highlights', e.target.value)}
          onBlur={(e) => handleArrayFieldBlur('highlights', e.target.value)}
          rows="2"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Separate each highlight with a comma</p>
      </div>

      {/* Inclusions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Inclusions
        </label>
        <textarea
          name="inclusions"
          placeholder="What's included (e.g., Hotel accommodation, All meals, Tour guide)"
          value={getArrayFieldValue('inclusions')}
          onChange={(e) => handleArrayFieldChange('inclusions', e.target.value)}
          onBlur={(e) => handleArrayFieldBlur('inclusions', e.target.value)}
          rows="2"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Separate each inclusion with a comma</p>
      </div>

      {/* Exclusions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Exclusions
        </label>
        <textarea
          name="exclusions"
          placeholder="What's not included (e.g., Flight tickets, Personal expenses, Travel insurance)"
          value={getArrayFieldValue('exclusions')}
          onChange={(e) => handleArrayFieldChange('exclusions', e.target.value)}
          onBlur={(e) => handleArrayFieldBlur('exclusions', e.target.value)}
          rows="2"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Separate each exclusion with a comma</p>
      </div>
    </div>
  );
};

export default BasicPackageInfo;
