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
    const isHorizontal = legendProps?.layout === "horizontal";
    return (
      <ul className={`${isHorizontal ? "flex flex-wrap justify-center gap-x-6 gap-y-2" : "flex flex-col gap-2"} text-xs text-gray-700`}>
        {payload.map((entry, index) => (
          <li key={`${entry.value}-${index}`} className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="w-2.5 h-2.5 rounded-full border border-gray-200 flex-shrink-0"
              style={{ backgroundColor: entry.color || entry.payload?.fill }}
            />
            <span className="truncate">
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
      <PieChart margin={legendProps?.layout === "horizontal" ? { left: 0, right: 0, top: 8, bottom: 60 } : { left: 0, right: 0, top: 16, bottom: 16 }}>
        <Pie
          data={data}
          labelLine={false}
          dataKey={dataKey}
          cx="50%"
          cy="40%"
          innerRadius={Math.min(height * 0.15, 60)}
          outerRadius={Math.min(height * 0.35, 110)}
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
