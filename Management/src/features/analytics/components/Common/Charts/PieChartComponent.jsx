import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const DEFAULT_PIE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
];

/**
 * PieChartComponent - Completely Redesigned
 * Modern donut chart with center label and external legend list
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
  // Calculate total for center label
  const total = data.reduce((sum, item) => sum + (item[dataKey] || 0), 0);

  const shouldRenderLegend = legendProps !== false;

  // Custom label renderer - positioned outside
  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
    if (percent < 0.05) return null; // Skip small segments
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return null; // We use external legend instead
  };

  return (
    <div className="flex items-center justify-center gap-6 h-full">
      {/* Chart */}
      <div className="relative" style={{ width: height * 0.8, height: height * 0.9 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              stroke="none"
              {...pieProps}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={tooltipFormatter || ((value) => `${value}`)}
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                padding: '12px 16px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-800">{total}</span>
          <span className="text-xs text-slate-400">Total</span>
        </div>
      </div>

      {/* Legend */}
      {shouldRenderLegend && (
        <div className="flex flex-col gap-2 max-h-full overflow-y-auto pr-2">
          {data.map((item, index) => (
            <div key={`legend-${index}`} className="flex items-center gap-2.5">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-slate-600 truncate max-w-[120px]">
                  {item[nameKey]}
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {item[dataKey]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PieChartComponent;
