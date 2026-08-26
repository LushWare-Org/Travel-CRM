import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { chartGridColor, chartAxisColor, chartTooltipStyle, chartLegendStyle } from '../chartTheme';

interface BarSeries {
  dataKey: string;
  fill: string;
  name: string;
}

interface BarChartComponentProps {
  data: Record<string, unknown>[];
  bars?: BarSeries[];
  xAxisKey?: string;
  height?: number;
  margin?: { top: number; right: number; left: number; bottom: number };
}

const BarChartComponent = ({
  data,
  bars = [],
  xAxisKey = 'name',
  height = 300,
  margin = { top: 10, right: 10, left: -10, bottom: 0 },
}: BarChartComponentProps) => {
  const defaultBars: BarSeries[] = [{ dataKey: 'value', fill: 'var(--color-chart-1)', name: 'Value' }];
  const barConfig = bars.length > 0 ? bars : defaultBars;

  const gradientId = (idx: number) => `barGradient-${idx}`;

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
        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          stroke={chartAxisColor}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={60}
        />
        <YAxis stroke={chartAxisColor} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'var(--color-muted)' }} />
        <Legend wrapperStyle={chartLegendStyle} iconType="circle" iconSize={8} />
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
