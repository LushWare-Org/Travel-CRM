// Shared recharts theming for every analytics chart - references the same
// CSS custom properties the bg-*/text-* utilities resolve, since recharts
// takes literal color strings on its own props, not Tailwind classes. This
// re-resolves live on theme toggle with no JS theme detection needed.
// Established in features/dashboard (Phase 3.1); see DESIGN.md's
// "Chart Theming (recharts)" section.
export const chartGridColor = 'var(--color-border)';
export const chartAxisColor = 'var(--color-muted-foreground)';

export const chartTooltipStyle = {
  backgroundColor: 'var(--color-popover)',
  color: 'var(--color-popover-foreground)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  boxShadow: 'var(--shadow-dropdown)',
  fontSize: '13px',
  padding: '10px 14px',
};

export const chartLegendStyle = {
  paddingTop: 20,
  color: 'var(--color-muted-foreground)',
  fontSize: '12px',
};

// The system's one sanctioned multi-hue set for distinguishing chart series
// (see DESIGN.md's Chart color section) - cycle through these instead of
// introducing ad hoc stock Tailwind/hex colors per series.
export const CHART_PALETTE = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];
