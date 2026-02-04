import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/**
 * BarChartComponent - Completely Redesigned
 * Modern bars with rounded corners, gradient fills, and sleek styling
 */
const BarChartComponent = ({
  data,
  bars = [],
  xAxisKey = "name",
  height = 300,
  margin = { top: 10, right: 10, left: -10, bottom: 0 },
}) => {
  const defaultBars = [{ dataKey: "value", fill: "#6366f1", name: "Value" }];
  const barConfig = bars.length > 0 ? bars : defaultBars;

  // Generate gradient IDs
  const gradientId = (idx) => `barGradient-${idx}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={margin} barGap={4}>
        <defs>
          {barConfig.map((bar, idx) => (
            <linearGradient key={idx} id={gradientId(idx)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bar.fill} stopOpacity={1} />
              <stop offset="100%" stopColor={bar.fill} stopOpacity={0.7} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e2e8f0"
          vertical={false}
        />
        <XAxis
          dataKey={xAxisKey}
          stroke="#94a3b8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={60}
        />
        <YAxis
          stroke="#94a3b8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            padding: '12px 16px'
          }}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
        />
        <Legend
          wrapperStyle={{ paddingTop: 20 }}
          iconType="circle"
          iconSize={8}
        />
        {barConfig.map((bar, idx) => (
          <Bar
            key={idx}
            dataKey={bar.dataKey}
            fill={`url(#${gradientId(idx)})`}
            radius={[6, 6, 0, 0]}
            name={bar.name}
            maxBarSize={50}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarChartComponent;
