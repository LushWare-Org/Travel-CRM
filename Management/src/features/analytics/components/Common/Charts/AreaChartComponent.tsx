import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { chartGridColor, chartAxisColor, chartTooltipStyle, chartLegendStyle } from '../chartTheme';

interface AreaSeries {
  dataKey: string;
  fill: string;
  stroke: string;
  name: string;
}

interface AreaChartComponentProps {
  data: Record<string, unknown>[];
  areas?: AreaSeries[];
  xAxisKey?: string;
  height?: number;
  margin?: { top: number; right: number; left: number; bottom: number };
}

const AreaChartComponent = ({
  data,
  areas = [],
  xAxisKey = 'month',
  height = 300,
  margin = { top: 10, right: 10, left: -10, bottom: 0 },
}: AreaChartComponentProps) => {
  const defaultAreas: AreaSeries[] = [
    { dataKey: 'value', fill: 'var(--color-chart-1)', stroke: 'var(--color-chart-1)', name: 'Value' },
  ];

  const areaConfig = areas.length > 0 ? areas : defaultAreas;

  const gradientId = (idx: number) => `areaGradient-${idx}-${areaConfig[idx]?.dataKey}`;

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
        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
        <XAxis dataKey={xAxisKey} stroke={chartAxisColor} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={chartAxisColor} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Legend wrapperStyle={chartLegendStyle} iconType="circle" iconSize={8} />
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
