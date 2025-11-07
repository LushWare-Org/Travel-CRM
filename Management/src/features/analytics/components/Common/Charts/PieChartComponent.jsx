import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/**
 * PieChartComponent
 * Reusable pie chart for distribution visualization
 */
const PieChartComponent = ({
  data,
  dataKey = "value",
  nameKey = "name",
  height = 300,
  colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"],
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: ${value}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey={dataKey}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default PieChartComponent;
