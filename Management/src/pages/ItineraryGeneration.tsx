/**
 * ItineraryGeneration Page Component
 * Main entry point for the itinerary generation feature
 * 
 * This component has been refactored into smaller, maintainable components.
 * All functionality is now organized in: src/features/itinerary/
 */

import { ItineraryGeneration as ItineraryGenerationContainer } from '../features/itinerary';
import PageCopilot from '../features/copilot/PageCopilot';

const ItineraryGeneration = () => {
  return (
    <PageCopilot pageKey="packages" scopeLabel="Packages">
      <ItineraryGenerationContainer />
    </PageCopilot>
  );
};

export default ItineraryGeneration;
