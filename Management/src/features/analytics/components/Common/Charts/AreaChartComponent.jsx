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
 * AreaChartComponent
 * Reusable area chart for trend visualization
 */
const AreaChartComponent = ({
  data,
  areas = [],
  xAxisKey = "month",
  height = 300,
  margin = { top: 5, right: 30, left: 0, bottom: 5 },
}) => {
  const defaultAreas = [
    { dataKey: "value", fill: "#3b82f6", stroke: "#1e40af", name: "Value" },
  ];

  const areaConfig = areas.length > 0 ? areas : defaultAreas;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={margin}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey={xAxisKey} stroke="#6b7280" />
        <YAxis stroke="#6b7280" />
        <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb" }} />
        <Legend />
        {areaConfig.map((area, idx) => (
          <Area
            key={idx}
            type="monotone"
            dataKey={area.dataKey}
            fill={area.fill}
            stroke={area.stroke}
            fillOpacity={0.6}
            name={area.name}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default AreaChartComponent;
