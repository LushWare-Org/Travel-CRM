import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Package, User } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormDialogHeader, FormDialogSection, FormDialogFooter } from '../FormDialogSections';

describe('FormDialogHeader', () => {
  it('renders the icon, title, and subtitle', () => {
    render(
      <Dialog open>
        <DialogContent>
          <FormDialogHeader icon={Package} title="Edit Lead" subtitle="Jane Doe" />
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText('Edit Lead')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });
});

describe('FormDialogSection', () => {
  it('calls onToggle with the section id on click', async () => {
    const onToggle = vi.fn();
    render(
      <FormDialogSection id="personal" icon={User} title="Personal Information" expanded={false} onToggle={onToggle}>
        <p>Field content</p>
      </FormDialogSection>
    );

    await userEvent.click(screen.getByRole('button', { name: /Personal Information/ }));
    expect(onToggle).toHaveBeenCalledWith('personal');
  });

  it('does not render children when collapsed', () => {
    render(
      <FormDialogSection id="personal" icon={User} title="Personal Information" expanded={false} onToggle={() => {}}>
        <p>Field content</p>
      </FormDialogSection>
    );

    expect(screen.queryByText('Field content')).not.toBeInTheDocument();
  });

  it('renders children and applies the "high colour" expanded state', () => {
    render(
      <FormDialogSection id="personal" icon={User} title="Personal Information" expanded onToggle={() => {}}>
        <p>Field content</p>
      </FormDialogSection>
    );

    expect(screen.getByText('Field content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Personal Information/ }).className).toContain('bg-primary');
  });

  it('renders the count badge when provided', () => {
    render(
      <FormDialogSection id="remarks" icon={User} title="Remarks" count={3} expanded onToggle={() => {}}>
        <p>Remark content</p>
      </FormDialogSection>
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

describe('FormDialogFooter', () => {
  it('renders children without the full-bleed DialogFooter classes', () => {
    render(
      <FormDialogFooter>
        <button>Cancel</button>
      </FormDialogFooter>
    );

    const button = screen.getByRole('button', { name: 'Cancel' });
    const footer = button.parentElement;
    expect(footer?.className).not.toContain('-mx-4');
    expect(footer?.className).not.toContain('bg-muted');
  });
});
