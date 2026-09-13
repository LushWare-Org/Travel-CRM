import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { chartGridColor, chartAxisColor, chartTooltipStyle, chartLegendStyle } from '../chartTheme';

interface LineSeries {
  dataKey: string;
  stroke: string;
  name: string;
}

interface LineChartComponentProps {
  data: Record<string, unknown>[];
  lines?: LineSeries[];
  xAxisKey?: string;
  height?: number;
  margin?: { top: number; right: number; left: number; bottom: number };
}

const LineChartComponent = ({
  data,
  lines = [],
  xAxisKey = 'month',
  height = 300,
  margin = { top: 10, right: 10, left: -10, bottom: 0 },
}: LineChartComponentProps) => {
  const defaultLines: LineSeries[] = [
    { dataKey: 'value', stroke: 'var(--color-chart-1)', name: 'Value' },
  ];

  const lineConfig = lines.length > 0 ? lines : defaultLines;

  const gradientId = (idx: number) => `lineGradient-${idx}`;

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
        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
        <XAxis dataKey={xAxisKey} stroke={chartAxisColor} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={chartAxisColor} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Legend wrapperStyle={chartLegendStyle} iconType="circle" iconSize={8} />
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
            activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--color-card)' }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default LineChartComponent;
