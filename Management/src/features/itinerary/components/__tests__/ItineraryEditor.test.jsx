import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
import { uploadItineraryImages } from '../../../../services/cloudinaryService';

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

  it('hands the trimmed images array to onDayChange when a day image is removed', async () => {
    const onDayChange = vi.fn();
    const day = {
      ...baseDay,
      images: [
        { url: 'https://res.cloudinary.com/x/a.jpg', publicId: 'day1/a' },
        { url: 'https://res.cloudinary.com/x/b.jpg', publicId: 'day1/b' },
      ],
    };
    render(
      <ItineraryEditor
        days={[day]}
        onDayChange={onDayChange}
        onAddDay={noop}
        onRemoveDay={noop}
        hideTitleAndDescription
      />,
    );

    const removeButtons = screen.getAllByTitle('Remove image');
    await userEvent.click(removeButtons[0]);

    expect(onDayChange).toHaveBeenCalledWith(1, {
      images: [{ url: 'https://res.cloudinary.com/x/b.jpg', publicId: 'day1/b' }],
    });
  });

  it('appends newly uploaded images to the existing day images on upload', async () => {
    const onDayChange = vi.fn();
    uploadItineraryImages.mockResolvedValue([{ url: 'https://res.cloudinary.com/x/new.jpg', publicId: 'day1/new' }]);
    const day = { ...baseDay, images: [{ url: 'https://res.cloudinary.com/x/a.jpg', publicId: 'day1/a' }] };

    render(
      <ItineraryEditor
        days={[day]}
        onDayChange={onDayChange}
        onAddDay={noop}
        onRemoveDay={noop}
        hideTitleAndDescription
      />,
    );

    const file = new File(['x'], 'new.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"][accept*="image"]');
    await userEvent.upload(input, file);

    await waitFor(() => expect(onDayChange).toHaveBeenCalledWith(1, {
      images: [
        { url: 'https://res.cloudinary.com/x/a.jpg', publicId: 'day1/a' },
        { url: 'https://res.cloudinary.com/x/new.jpg', publicId: 'day1/new' },
      ],
    }));
  });
});
