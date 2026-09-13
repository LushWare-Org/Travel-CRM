import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormFieldItem } from '../form';
import { Input } from '../input';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
});
type Schema = z.infer<typeof schema>;

function TestForm({ onSubmit }: { onSubmit: (values: Schema) => void }) {
  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <FormFieldItem label="Email" error={fieldState.error}>
              <Input {...field} />
            </FormFieldItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}

describe('Form / FormField / FormFieldItem', () => {
  it('renders the field label', () => {
    render(<TestForm onSubmit={vi.fn()} />);

    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('shows the zod validation message and does not call onSubmit when the value is invalid', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TestForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the required message when submitted empty', async () => {
    const user = userEvent.setup();
    render(<TestForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
  });

  it('calls onSubmit with the parsed values when valid', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TestForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox'), 'alice@test.com');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ email: 'alice@test.com' }, expect.anything());
    });
  });

  it('marks the field as invalid via data-invalid once an error is present', async () => {
    const user = userEvent.setup();
    render(<TestForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByRole('group')).toHaveAttribute('data-invalid', 'true');
    });
  });
});
