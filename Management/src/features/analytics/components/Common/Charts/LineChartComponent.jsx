import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/**
 * LineChartComponent
 * Reusable line chart for trend analysis
 */
const LineChartComponent = ({
  data,
  lines = [],
  xAxisKey = "month",
  height = 300,
  margin = { top: 5, right: 30, left: 0, bottom: 5 },
}) => {
  const defaultLines = [
    { dataKey: "value", stroke: "#3b82f6", name: "Value" },
  ];

  const lineConfig = lines.length > 0 ? lines : defaultLines;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey={xAxisKey} stroke="#6b7280" />
        <YAxis stroke="#6b7280" />
        <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb" }} />
        <Legend />
        {lineConfig.map((line, idx) => (
          <Line
            key={idx}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.stroke}
            strokeWidth={2}
            dot={{ fill: line.stroke, r: 4 }}
            activeDot={{ r: 6 }}
            name={line.name}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default LineChartComponent;
