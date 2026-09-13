import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type DataTableColumn } from '../DataTable';

interface Lead {
  id: string;
  name: string;
  total: number;
}

const columns: DataTableColumn<Lead>[] = [
  { key: 'name', header: 'Lead' },
  { key: 'total', header: 'Total (LKR)', numeric: true, sortable: true },
];

const rows: Lead[] = [
  { id: 'L-1', name: 'Priya Nair', total: 184500 },
  { id: 'L-2', name: 'Marcus Webb', total: 96200 },
];

describe('DataTable', () => {
  it('renders a header and a row per data item', () => {
    render(<DataTable columns={columns} data={rows} getRowKey={(r) => r.id} />);

    expect(screen.getByText('Lead')).toBeInTheDocument();
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();
    expect(screen.getByText('Marcus Webb')).toBeInTheDocument();
    expect(screen.getByText('184500')).toBeInTheDocument();
  });

  it('shows the empty message when there is no data and it is not loading', () => {
    render(<DataTable columns={columns} data={[]} getRowKey={(r) => r.id} emptyMessage="No leads yet." />);

    expect(screen.getByText('No leads yet.')).toBeInTheDocument();
    expect(screen.queryByText('Priya Nair')).not.toBeInTheDocument();
  });

  it('shows loading skeleton rows instead of data or the empty message when loading', () => {
    render(<DataTable columns={columns} data={rows} getRowKey={(r) => r.id} loading emptyMessage="No leads yet." />);

    expect(screen.queryByText('Priya Nair')).not.toBeInTheDocument();
    expect(screen.queryByText('No leads yet.')).not.toBeInTheDocument();
  });

  it('calls onSort with the column key when a sortable header is clicked', async () => {
    const onSort = vi.fn();
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={rows} getRowKey={(r) => r.id} onSort={onSort} />);

    await user.click(screen.getByRole('button', { name: /Total \(LKR\)/ }));

    expect(onSort).toHaveBeenCalledWith('total');
  });

  it('does not render a sort button for non-sortable columns', () => {
    render(<DataTable columns={columns} data={rows} getRowKey={(r) => r.id} />);

    expect(screen.queryByRole('button', { name: 'Lead' })).not.toBeInTheDocument();
  });

  it('renders custom cell content via a column render function', () => {
    const customColumns: DataTableColumn<Lead>[] = [
      { key: 'name', header: 'Lead', render: (row) => `${row.name} (${row.id})` },
    ];
    render(<DataTable columns={customColumns} data={rows} getRowKey={(r) => r.id} />);

    expect(screen.getByText('Priya Nair (L-1)')).toBeInTheDocument();
  });
});
