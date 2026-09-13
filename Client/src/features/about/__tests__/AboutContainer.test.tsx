import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AboutContainer from '../AboutContainer';

describe('AboutContainer', () => {
  it('renders both tab labels and the default story-tab content', () => {
    render(<AboutContainer />);

    expect(screen.getByRole('button', { name: 'Our Story' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mission & Vision' })).toBeInTheDocument();
    expect(screen.getByText('Our Journey Began with a Dream')).toBeInTheDocument();
    expect(screen.queryByText('Our Mission')).not.toBeInTheDocument();
  });

  it('switches to the mission tab, showing mission content and hiding story content', async () => {
    const user = userEvent.setup();
    render(<AboutContainer />);

    await user.click(screen.getByRole('button', { name: 'Mission & Vision' }));

    expect(screen.getByText('Our Mission')).toBeInTheDocument();
    expect(screen.getByText('Our Vision')).toBeInTheDocument();
    expect(screen.queryByText('Our Journey Began with a Dream')).not.toBeInTheDocument();
  });

  it('switches back to the story tab from the mission tab', async () => {
    const user = userEvent.setup();
    render(<AboutContainer />);

    await user.click(screen.getByRole('button', { name: 'Mission & Vision' }));
    await user.click(screen.getByRole('button', { name: 'Our Story' }));

    expect(screen.getByText('Our Journey Began with a Dream')).toBeInTheDocument();
    expect(screen.queryByText('Our Mission')).not.toBeInTheDocument();
  });
});
