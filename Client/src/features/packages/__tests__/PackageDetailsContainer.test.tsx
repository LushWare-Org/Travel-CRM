import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PackageDetailsContainer from '../PackageDetailsContainer';
import ReviewModal from '../components/ReviewModal';
import type { ReviewFormData } from '../components/ReviewModal';
import {
  fetchPackageById,
  fetchPackageReviews,
  submitReview,
} from '../../../services/api/packages';
import { submitBookingRequest } from '../../../services/api/booking';
import { generateAndDownloadPDF } from '../pdf/pdfService';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../services/api/packages', () => ({
  fetchPackageById: vi.fn(),
  submitReview: vi.fn(),
  fetchPackageReviews: vi.fn(),
}));

vi.mock('../../../services/api/booking', () => ({
  submitBookingRequest: vi.fn(),
}));

vi.mock('../pdf/pdfService', () => ({
  generateAndDownloadPDF: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

const fetchPackageByIdMock = vi.mocked(fetchPackageById);
const fetchPackageReviewsMock = vi.mocked(fetchPackageReviews);
const submitReviewMock = vi.mocked(submitReview);
const submitBookingRequestMock = vi.mocked(submitBookingRequest);
const generateAndDownloadPDFMock = vi.mocked(generateAndDownloadPDF);

const mockPackage = {
  id: 'pkg-1',
  slug: 'bali-bliss',
  title: 'Bali Bliss',
  name: 'Bali Bliss',
  description: 'A 7-day luxury escape through Bali.',
  destinationRaw: 'Bali, Indonesia',
  destination: {
    raw: 'Bali, Indonesia',
    name: 'Bali',
    country: 'Indonesia',
    type: 'country',
    region: 'Asia',
    slug: 'bali',
    key: 'bali',
    nameSlug: 'bali',
    countrySlug: 'indonesia',
  },
  duration_days: 7,
  price_from: 1200,
  currency: 'INR',
  termsAndConditions: '',
  category: 'Adventure',
  difficulty: 'Moderate',
  rating: 4.9,
  reviews_count: 250,
  bookings: 12,
  image_url: 'https://example.com/bali.jpg',
  images: ['https://example.com/bali.jpg'],
  highlights: ['Private villa stays', 'Sunrise volcano trek'],
  inclusions: ['Luxury hotel', 'Daily breakfast'],
  exclusions: ['International flights'],
  activities: ['Trekking'],
  itinerary: [{ dayNumber: 1, title: 'Arrival', description: 'Welcome to Bali', locations: ['Denpasar'], activities: ['Airport pickup'] }],
  isFeatured: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  raw: { _id: 'pkg-1', id: 'pkg-1', name: 'Bali Bliss', bookings: 12 },
};

const renderContainer = () =>
  render(
    <MemoryRouter initialEntries={['/package/pkg-1']}>
      <Routes>
        <Route path="/package/:id" element={<PackageDetailsContainer />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  mocks.useAuth.mockReturnValue({ user: null });
  fetchPackageByIdMock.mockReset();
  fetchPackageReviewsMock.mockReset();
  submitReviewMock.mockReset();
  submitBookingRequestMock.mockReset();
  generateAndDownloadPDFMock.mockReset();
  fetchPackageByIdMock.mockResolvedValue(mockPackage);
  fetchPackageReviewsMock.mockResolvedValue({ reviews: [], pagination: null });
  submitReviewMock.mockResolvedValue({ id: 'rev-1', rating: 5, comment: 'Great trip!' });
  submitBookingRequestMock.mockResolvedValue({ success: true });
  generateAndDownloadPDFMock.mockResolvedValue(undefined);
});

describe('PackageDetailsContainer', () => {
  it('renders the package details from the mocked package', async () => {
    renderContainer();

    expect(await screen.findByText('Bali, Indonesia')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Book Now/ })).toBeInTheDocument();
    expect(screen.getByText(/1,200/)).toBeInTheDocument();
    expect(fetchPackageByIdMock).toHaveBeenCalledWith('pkg-1');
    expect(fetchPackageReviewsMock).toHaveBeenCalledWith('pkg-1', 50, 1);
  });

  it('keeps the gallery loading state up until every hero image has loaded', async () => {
    renderContainer();
    await screen.findByText('Bali, Indonesia');

    // jsdom never fires image load events on its own, so the loading cover is up.
    expect(screen.getByTestId('package-gallery-loading')).toBeInTheDocument();

    fireEvent.load(screen.getByAltText('Bali Bliss - 1'));

    expect(screen.queryByTestId('package-gallery-loading')).not.toBeInTheDocument();
  });

  it('swaps a broken gallery image for the shared fallback image', async () => {
    renderContainer();
    await screen.findByText('Bali, Indonesia');

    const heroImage = screen.getByAltText('Bali Bliss - 1') as HTMLImageElement;
    fireEvent.error(heroImage);

    expect(heroImage.src).toContain('/lush/fallback.jpg');
    expect(screen.queryByTestId('package-gallery-loading')).not.toBeInTheDocument();
  });

  it('renders the shared fallback image when the package has no gallery images', async () => {
    fetchPackageByIdMock.mockResolvedValueOnce({
      ...mockPackage,
      image_url: '',
      images: [],
    });
    renderContainer();
    await screen.findByText('Bali, Indonesia');

    const heroImage = screen.getByAltText('Bali Bliss - 1') as HTMLImageElement;
    expect(heroImage.src).toContain('/lush/fallback.jpg');
  });

  it('opens the booking modal and submits the exact booking payload', async () => {
    const user = userEvent.setup();
    renderContainer();
    await screen.findByText('Bali, Indonesia');

    await user.click(screen.getByRole('button', { name: /Book Now/ }));
    expect(screen.getByText('Book Your Adventure')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /Next Step/ }));
    await user.click(screen.getByRole('button', { name: /Next Step/ }));
    await user.click(screen.getByRole('button', { name: /Submit Booking Request/ }));

    expect(submitBookingRequestMock).toHaveBeenCalledTimes(1);
    expect(submitBookingRequestMock).toHaveBeenCalledWith({
      name: undefined,
      email: 'jane@example.com',
      phone: undefined,
      travelers: 1,
      travelDate: '',
      endDate: undefined,
      message: undefined,
      packageId: 'pkg-1',
    });
    expect(await screen.findByText('Booking Submitted Successfully!')).toBeInTheDocument();
  });

  it('shows the API error message when the booking submission fails', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    submitBookingRequestMock.mockRejectedValueOnce(new Error('Server unavailable'));
    renderContainer();
    await screen.findByText('Bali, Indonesia');

    await user.click(screen.getByRole('button', { name: /Book Now/ }));
    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /Next Step/ }));
    await user.click(screen.getByRole('button', { name: /Next Step/ }));
    await user.click(screen.getByRole('button', { name: /Submit Booking Request/ }));

    expect(alertSpy).toHaveBeenCalledWith('Server unavailable');
    alertSpy.mockRestore();
  });
});

describe('ReviewModal', () => {
  it('submits the review through the API when the fields are filled', async () => {
    const user = userEvent.setup();

    const Harness = () => {
      const [data, setData] = useState<ReviewFormData>({
        name: '',
        email: '',
        rating: 0,
        comment: '',
      });
      const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await submitReview('pkg-1', data);
      };
      return (
        <ReviewModal
          open
          reviewData={data}
          isSubmittingReview={false}
          setReviewData={setData}
          onSubmit={handleSubmit}
          onClose={() => {}}
        />
      );
    };

    render(<Harness />);
    expect(screen.getByText('Write a Review')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Enter your name'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('Share your experience...'), 'Incredible trip!');
    // The five star buttons follow the modal's close button in the DOM.
    await user.click(screen.getAllByRole('button')[5]);

    await user.click(screen.getByRole('button', { name: /Submit Review/ }));

    expect(submitReviewMock).toHaveBeenCalledTimes(1);
    expect(submitReviewMock).toHaveBeenCalledWith('pkg-1', {
      name: 'Jane Doe',
      email: '',
      rating: 5,
      comment: 'Incredible trip!',
    });
  });
});
