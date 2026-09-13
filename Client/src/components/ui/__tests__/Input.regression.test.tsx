import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../input';

describe('Input ref regression', () => {
  it('forwards an HTML input ref so form libraries can focus invalid fields', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="Email" />);

    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(ref.current).toBe(input);

    ref.current?.focus();
    expect(input).toHaveFocus();
  });
});
