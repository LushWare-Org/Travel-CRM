import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ImageUpload from '../ImageUpload';

const persistedImages = [
  { id: 'img-1', url: 'https://cdn/a.jpg', publicId: 'p-a' },
  { id: 'img-2', url: 'https://cdn/b.jpg', publicId: 'p-b' },
];

describe('ImageUpload — cover picker', () => {
  it('highlights the thumbnail matching coverUrl as the cover', () => {
    render(
      <ImageUpload
        images={persistedImages}
        onImageUpload={() => {}}
        onImageRemove={() => {}}
        coverUrl="https://cdn/b.jpg"
        onSetCover={() => {}}
      />,
    );
    expect(screen.getByText('Cover')).toBeInTheDocument();
  });

  it('calls onSetCover with the image id when the star button is clicked', async () => {
    const onSetCover = vi.fn();
    render(
      <ImageUpload
        images={persistedImages}
        onImageUpload={() => {}}
        onImageRemove={() => {}}
        coverUrl={null}
        onSetCover={onSetCover}
      />,
    );

    const setCoverButtons = screen.getAllByRole('button', { name: 'Set as cover image' });
    await userEvent.click(setCoverButtons[1]);

    expect(onSetCover).toHaveBeenCalledWith('img-2');
  });

  it('does not render a cover control when onSetCover is not provided', () => {
    render(
      <ImageUpload images={persistedImages} onImageUpload={() => {}} onImageRemove={() => {}} />,
    );
    expect(screen.queryByRole('button', { name: 'Set as cover image' })).not.toBeInTheDocument();
  });

  it('does not render a cover control for an unsaved image with no id', () => {
    render(
      <ImageUpload
        images={[{ url: 'https://cdn/new.jpg', publicId: 'p-new' }]}
        onImageUpload={() => {}}
        onImageRemove={() => {}}
        onSetCover={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Set as cover image' })).not.toBeInTheDocument();
  });
});

describe('ImageUpload — delete pending state', () => {
  it('shows a spinner and disables the remove button for an in-flight delete', () => {
    render(
      <ImageUpload
        images={persistedImages}
        onImageUpload={() => {}}
        onImageRemove={() => {}}
        deletingIndexes={[0]}
      />,
    );
    const removeButtons = screen.getAllByRole('button', { name: 'Remove image' });
    expect(removeButtons[0]).toBeDisabled();
    expect(removeButtons[1]).not.toBeDisabled();
  });

  it('calls onImageRemove with the clicked index', async () => {
    const onImageRemove = vi.fn();
    render(
      <ImageUpload images={persistedImages} onImageUpload={() => {}} onImageRemove={onImageRemove} />,
    );
    const removeButtons = screen.getAllByRole('button', { name: 'Remove image' });
    await userEvent.click(removeButtons[1]);
    expect(onImageRemove).toHaveBeenCalledWith(1);
  });
});
