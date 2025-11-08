import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export const DEFAULT_PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#6366f1",
  "#22c55e",
  "#f97316",
  "#a855f7",
];

/**
 * PieChartComponent
 * Reusable pie chart for distribution visualization
 */
const PieChartComponent = ({
  data,
  dataKey = "value",
  nameKey = "name",
  height = 300,
  colors = DEFAULT_PIE_COLORS,
  legendProps = {},
  pieProps = {},
  tooltipFormatter,
  labelFormatter,
}) => {
  const defaultLegend = ({ payload = [] }) => {
    if (!payload || payload.length === 0) return null;
    return (
      <ul className="flex flex-col gap-2 text-sm text-gray-700">
        {payload.map((entry, index) => (
          <li key={`${entry.value}-${index}`} className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full border border-gray-200"
              style={{ backgroundColor: entry.color || entry.payload?.fill }}
            />
            <span>
              {entry.payload?.[nameKey] ?? entry.value}:{" "}
              <span className="font-semibold text-gray-900">
                {entry.payload?.[dataKey] ?? entry.value}
              </span>
            </span>
          </li>
        ))}
      </ul>
    );
  };

  const shouldRenderLegend = legendProps !== false;
  const effectiveLegendProps = shouldRenderLegend
    ? { align: "right", verticalAlign: "middle", ...(legendProps === true ? {} : legendProps) }
    : null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ left: 0, right: 0, top: 16, bottom: 16 }}>
        <Pie
          data={data}
          labelLine={false}
          dataKey={dataKey}
          cx="50%"
          cy="50%"
          innerRadius={Math.min(height * 0.2, 70)}
          outerRadius={Math.min(height * 0.4, 130)}
          {...pieProps}
          label={
            pieProps.label !== undefined
              ? pieProps.label
              : ((entry) => {
                  if (typeof labelFormatter === "function") {
                    return labelFormatter(entry);
                  }
                  const value = entry?.[dataKey];
                  const label = entry?.[nameKey];
                  return value > 0 ? `${label}: ${value}` : "";
                })
          }
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={tooltipFormatter || ((value) => `${value}`)} />
        {shouldRenderLegend && effectiveLegendProps && (
          <Legend
            layout="vertical"
            content={effectiveLegendProps?.content || defaultLegend}
            {...effectiveLegendProps}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
};

export default PieChartComponent;
