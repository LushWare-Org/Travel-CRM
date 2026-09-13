import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { StatCard } from '../StatCard';

describe('StatCard', () => {
  it('renders the label, value, and unit', () => {
    render(<StatCard icon={Users} label="Open leads" value={128} unit="leads" />);

    expect(screen.getByText('Open leads')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('leads')).toBeInTheDocument();
  });

  it('renders a subtitle when provided', () => {
    render(<StatCard icon={Users} label="Revenue MTD" value="4.82M" subtitle="vs 4.68M last month" />);

    expect(screen.getByText('vs 4.68M last month')).toBeInTheDocument();
  });

  it('does not render trend or subtitle when not provided', () => {
    render(<StatCard icon={Users} label="Open leads" value={128} />);

    expect(screen.queryByText(/vs /)).not.toBeInTheDocument();
  });

  it('renders an upward trend in the success color', () => {
    render(<StatCard icon={Users} label="Open leads" value={128} trend="+12 this week" trendDirection="up" />);

    const trend = screen.getByText('+12 this week');
    expect(trend.parentElement?.className).toContain('text-success');
  });

  it('renders a downward trend in the destructive color', () => {
    render(<StatCard icon={Users} label="Overdue invoices" value={3} trend="-2 vs last week" trendDirection="down" />);

    const trend = screen.getByText('-2 vs last week');
    expect(trend.parentElement?.className).toContain('text-destructive');
  });

  it('renders a loading skeleton instead of content when loading', () => {
    render(<StatCard icon={Users} label="Open leads" value={128} loading />);

    expect(screen.queryByText('Open leads')).not.toBeInTheDocument();
    expect(screen.queryByText('128')).not.toBeInTheDocument();
  });
});
