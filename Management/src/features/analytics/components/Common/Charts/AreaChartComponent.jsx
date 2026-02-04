import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/**
 * AreaChartComponent - Redesigned
 * Modern area chart with gradient fills and smooth styling
 */
const AreaChartComponent = ({
  data,
  areas = [],
  xAxisKey = "month",
  height = 300,
  margin = { top: 10, right: 10, left: -10, bottom: 0 },
}) => {
  const defaultAreas = [
    { dataKey: "value", fill: "#6366f1", stroke: "#4f46e5", name: "Value" },
  ];

  const areaConfig = areas.length > 0 ? areas : defaultAreas;

  // Generate unique gradient IDs
  const gradientId = (idx) => `areaGradient-${idx}-${areaConfig[idx]?.dataKey}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={margin}>
        <defs>
          {areaConfig.map((area, idx) => (
            <linearGradient key={idx} id={gradientId(idx)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={area.fill} stopOpacity={0.4} />
              <stop offset="95%" stopColor={area.fill} stopOpacity={0.05} />
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
        {areaConfig.map((area, idx) => (
          <Area
            key={idx}
            type="monotone"
            dataKey={area.dataKey}
            fill={`url(#${gradientId(idx)})`}
            stroke={area.stroke}
            strokeWidth={2}
            name={area.name}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default AreaChartComponent;
