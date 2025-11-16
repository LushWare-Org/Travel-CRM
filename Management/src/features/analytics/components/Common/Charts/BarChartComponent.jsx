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
 * BarChartComponent
 * Reusable bar chart for comparisons
 */
const BarChartComponent = ({
  data,
  bars = [],
  xAxisKey = "name",
  height = 300,
  margin = { top: 5, right: 30, left: 0, bottom: 5 },
}) => {
  const defaultBars = [{ dataKey: "value", fill: "#3b82f6", name: "Value" }];

  const barConfig = bars.length > 0 ? bars : defaultBars;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey={xAxisKey} stroke="#6b7280" />
        <YAxis stroke="#6b7280" />
        <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb" }} />
        <Legend />
        {barConfig.map((bar, idx) => (
          <Bar
            key={idx}
            dataKey={bar.dataKey}
            fill={bar.fill}
            radius={[8, 8, 0, 0]}
            name={bar.name}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarChartComponent;
