import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stepper from '../Stepper';

const STEPS = [{ label: 'Contact' }, { label: 'Travel' }, { label: 'Review' }];

describe('Stepper', () => {
  it('marks steps before currentStep as complete with a checkmark', () => {
    render(<Stepper steps={STEPS} currentStep={2} />);
    const items = screen.getAllByRole('listitem');
    // Step 1 is complete: renders a checkmark svg, not the literal "1".
    expect(items[0].querySelector('svg')).toBeInTheDocument();
    expect(items[0]).not.toHaveTextContent('1');
  });

  it('marks the current step active via aria-current', () => {
    render(<Stepper steps={STEPS} currentStep={2} />);
    const items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[2]).not.toHaveAttribute('aria-current');
  });

  it('renders every step label', () => {
    render(<Stepper steps={STEPS} currentStep={1} />);
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });
});
