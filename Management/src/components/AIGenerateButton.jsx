/**
 * AI Generate Button Component
 * Simple button to trigger AI content generation for packages
 */

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import toast from '@/lib/toast';
import packageAIApi from '../services/packageAIApi.js';

const AIGenerateButton = ({ packageId, onContentGenerated, disabled = false }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!packageId) {
      toast.error('Package ID is required');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await packageAIApi.generateContent(packageId);
      
      if (response.success) {
        toast.success('AI content generated successfully!');
        if (onContentGenerated) {
          onContentGenerated(response.data);
        }
      } else {
        toast.error(response.message || 'Failed to generate content');
      }
    } catch (error) {
      console.error('Error generating AI content:', error);
      toast.error(error.message || 'Failed to generate AI content');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={disabled || isGenerating}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
      {isGenerating ? 'Generating...' : 'Generate with AI'}
    </button>
  );
};

export default AIGenerateButton;

