import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CareerContainer from '../CareerContainer';
import careerService from '../../../services/api/career';
import { isImgbbConfigured, uploadResumeToImgbb } from '../services/imageUpload';

vi.mock('../../../services/api/career', () => ({
  default: {
    getActiveVacancies: vi.fn(),
    submitApplication: vi.fn(),
  },
}));

vi.mock('../services/imageUpload', () => ({
  isImgbbConfigured: vi.fn(),
  uploadResumeToImgbb: vi.fn(),
}));

const getActiveVacanciesMock = vi.mocked(careerService.getActiveVacancies);
const submitApplicationMock = vi.mocked(careerService.submitApplication);
const isImgbbConfiguredMock = vi.mocked(isImgbbConfigured);
const uploadResumeToImgbbMock = vi.mocked(uploadResumeToImgbb);

const mockVacancies = [
  {
    _id: 'v1',
    position: 'Travel Consultant',
    type: 'Full-time',
    location: 'Chennai',
    experience: { min: 2 },
  },
  {
    _id: 'v2',
    position: 'Sales Executive',
    type: 'Full-time',
    location: 'Coimbatore',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  getActiveVacanciesMock.mockResolvedValue({
    status: 'success',
    data: { vacancies: mockVacancies },
  });
  isImgbbConfiguredMock.mockReturnValue(true);
});

describe('CareerContainer', () => {
  it('renders the open positions and the application form once vacancies load', async () => {
    render(<CareerContainer />);

    expect(screen.getByText('Open Positions')).toBeInTheDocument();
    expect(await screen.findByText('Travel Consultant')).toBeInTheDocument();
    expect(screen.getByText('Sales Executive')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /apply now/i })).toHaveLength(2);
    expect(screen.getByRole('button', { name: /submit application/i })).toBeInTheDocument();
    expect(getActiveVacanciesMock).toHaveBeenCalledWith({ status: 'active' });
  });

  it('shows the expected validation errors and does not submit when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<CareerContainer />);
    await screen.findByText('Travel Consultant');

    await user.click(screen.getByRole('button', { name: /submit application/i }));

    expect(screen.getByText('Full name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Phone number is required')).toBeInTheDocument();
    expect(screen.getByText('Please select a position from available options')).toBeInTheDocument();
    expect(screen.getByText('Please upload your resume')).toBeInTheDocument();
    expect(screen.getByText('You must agree to the terms')).toBeInTheDocument();
    expect(submitApplicationMock).not.toHaveBeenCalled();
  });

  it('uploads the resume to imgbb and submits the expected payload on a valid application', async () => {
    const user = userEvent.setup();
    const resumeFile = new File(['resume-content'], 'jane-resume.pdf', {
      type: 'application/pdf',
    });
    uploadResumeToImgbbMock.mockResolvedValue('https://i.imgur.com/jane-resume-uploaded.png');
    submitApplicationMock.mockResolvedValue({ status: 'success' });

    render(<CareerContainer />);
    await screen.findByText('Travel Consultant');

    await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Traveler');
    await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
    await user.type(screen.getByPlaceholderText('Your phone number'), '9876543210');
    await user.selectOptions(screen.getByRole('combobox'), 'Travel Consultant');
    await user.type(
      screen.getByPlaceholderText("Tell us why you'd be a great fit for this position..."),
      'I love travel'
    );
    await user.upload(screen.getByLabelText(/drop your file here/i), resumeFile);
    await user.click(screen.getByLabelText(/I confirm that I have read and agree to the terms/i));
    await user.click(screen.getByRole('button', { name: /submit application/i }));

    expect(uploadResumeToImgbbMock).toHaveBeenCalledWith(resumeFile);
    expect(submitApplicationMock).toHaveBeenCalledTimes(1);
    expect(submitApplicationMock).toHaveBeenCalledWith({
      fullName: 'Jane Traveler',
      email: 'jane@example.com',
      phone: '9876543210',
      position: 'Travel Consultant',
      coverLetter: 'I love travel',
      agreeTerms: true,
      resumeUrl: 'https://i.imgur.com/jane-resume-uploaded.png',
      resumeFileName: 'jane-resume.pdf',
    });
    expect(await screen.findByText('Application Submitted Successfully!')).toBeInTheDocument();
  });
});
