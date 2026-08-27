import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import LazyIcon from '../LazyIcon';

describe('LazyIcon', () => {
  it('renders a placeholder span before the dynamic import resolves', () => {
    const { container } = render(<LazyIcon name="Plane" size={14} />);

    const placeholder = container.querySelector('span');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveStyle({ display: 'inline-block', width: '14px', height: '14px' });
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('resolves and renders the requested icon once the dynamic import lands', async () => {
    const { container } = render(<LazyIcon name="Plane" size={14} className="w-3.5 h-3.5" />);

    await waitFor(() => expect(container.querySelector('svg')).toBeInTheDocument());

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '14');
    expect(svg).toHaveAttribute('height', '14');
    expect(svg).toHaveClass('w-3.5', 'h-3.5');
  });

  it('stays on the placeholder for an unknown icon name', async () => {
    const { container } = render(<LazyIcon name="DefinitelyNotAnIcon" size={16} />);

    // Dynamic-import exception: this test intentionally waits on the module
    // loading boundary LazyIcon exercises — the icon is resolved through the
    // component's own dynamic import, so a static import would not guarantee
    // the component's .then has run (the module is cached, so awaiting the
    // same specifier here does).
    await import('lucide-react');

    expect(container.querySelector('span')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
