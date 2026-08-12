import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../../../services/cloudinaryService', () => ({
  uploadItineraryImages: vi.fn(),
}));
vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));
vi.mock('../ActivitySelector', () => ({ default: () => <div data-testid="activity-selector" /> }));
vi.mock('../LocationSelector', () => ({ default: () => <div data-testid="location-selector" /> }));
vi.mock('../form/TransportRowEditor', () => ({ default: () => <div data-testid="transport-row-editor" /> }));
vi.mock('../../../shared', () => ({
  FlightSelectionModal: () => null,
  HotelSelectionModal: () => null,
}));

import ItineraryEditor from '../ItineraryEditor';

const baseDay = {
  dayNumber: 1,
  title: 'Arrival',
  description: 'Arrival day',
  locations: [],
  activities: [],
  transports: [],
  images: [],
};

const noop = () => {};

describe('ItineraryEditor — Day Images visibility', () => {
  // Regression coverage for the bug this fixes: EditLeadDialog passes
  // hideTitleAndDescription={true} to hide the title/description text
  // fields, but the "Day Images" upload section was accidentally nested
  // inside that same guard — hiding image upload specifically in the lead
  // editing flow even though package editing (which doesn't pass the prop)
  // showed it fine.

  it('renders the Day Images section when hideTitleAndDescription is true (the lead-editing case)', () => {
    render(
      <ItineraryEditor
        days={[baseDay]}
        onDayChange={noop}
        onAddDay={noop}
        onRemoveDay={noop}
        hideTitleAndDescription
      />,
    );
    expect(screen.getByText('Day Images')).toBeInTheDocument();
    expect(screen.getByText('Upload Day Images')).toBeInTheDocument();
  });

  it('renders the Day Images section when hideTitleAndDescription is false (the package-editing case)', () => {
    render(
      <ItineraryEditor
        days={[baseDay]}
        onDayChange={noop}
        onAddDay={noop}
        onRemoveDay={noop}
        hideTitleAndDescription={false}
      />,
    );
    expect(screen.getByText('Day Images')).toBeInTheDocument();
  });

  it('still hides the Day Title/Description fields when hideTitleAndDescription is true (guards against over-correcting the fix)', () => {
    render(
      <ItineraryEditor
        days={[baseDay]}
        onDayChange={noop}
        onAddDay={noop}
        onRemoveDay={noop}
        hideTitleAndDescription
      />,
    );
    expect(screen.queryByText('Day Title')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g., Arrival in Dubai (optional)')).not.toBeInTheDocument();
  });

  it('shows the Day Title field when hideTitleAndDescription is false', () => {
    render(
      <ItineraryEditor
        days={[baseDay]}
        onDayChange={noop}
        onAddDay={noop}
        onRemoveDay={noop}
        hideTitleAndDescription={false}
      />,
    );
    expect(screen.getByText('Day Title')).toBeInTheDocument();
  });

  it('renders already-uploaded day images in the grid', () => {
    render(
      <ItineraryEditor
        days={[{ ...baseDay, images: [{ url: 'https://res.cloudinary.com/x/a.jpg' }] }]}
        onDayChange={noop}
        onAddDay={noop}
        onRemoveDay={noop}
        hideTitleAndDescription
      />,
    );
    expect(screen.getByAltText('Day 1 Image 1')).toHaveAttribute('src', 'https://res.cloudinary.com/x/a.jpg');
  });
});
