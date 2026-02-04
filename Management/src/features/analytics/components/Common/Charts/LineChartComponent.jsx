import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

/**
 * LineChartComponent - Completely Redesigned
 * Modern area-line hybrid with gradient fills and smooth styling
 */
const LineChartComponent = ({
  data,
  lines = [],
  xAxisKey = "month",
  height = 300,
  margin = { top: 10, right: 10, left: -10, bottom: 0 },
  showArea = false,
}) => {
  const defaultLines = [
    { dataKey: "value", stroke: "#6366f1", name: "Value" },
  ];

  const lineConfig = lines.length > 0 ? lines : defaultLines;

  // Generate unique gradient IDs
  const gradientId = (idx) => `lineGradient-${idx}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={margin}>
        <defs>
          {lineConfig.map((line, idx) => (
            <linearGradient key={idx} id={gradientId(idx)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={line.stroke} stopOpacity={0.2} />
              <stop offset="95%" stopColor={line.stroke} stopOpacity={0} />
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
          itemStyle={{ padding: '2px 0' }}
          labelStyle={{ fontWeight: 600, marginBottom: 8, color: '#1e293b' }}
        />
        <Legend
          wrapperStyle={{ paddingTop: 20 }}
          iconType="circle"
          iconSize={8}
        />
        {lineConfig.map((line, idx) => (
          <Area
            key={idx}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.stroke}
            strokeWidth={2.5}
            fill={`url(#${gradientId(idx)})`}
            name={line.name}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default LineChartComponent;
