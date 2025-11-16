# Analytics Charts - Quick Reference Guide

## 🎯 Quick Start

### Using LineChartComponent
```jsx
import { LineChartComponent } from "../Common";

<LineChartComponent
  data={[
    { month: "Jan", sales: 100, revenue: 5000 },
    { month: "Feb", sales: 150, revenue: 7500 },
  ]}
  lines={[
    { dataKey: "sales", stroke: "#3b82f6", name: "Sales" },
    { dataKey: "revenue", stroke: "#10b981", name: "Revenue" }
  ]}
  xAxisKey="month"
  height={350}
/>
```

### Using BarChartComponent
```jsx
import { BarChartComponent } from "../Common";

<BarChartComponent
  data={[
    { name: "Category A", value: 400 },
    { name: "Category B", value: 300 },
  ]}
  bars={[
    { dataKey: "value", fill: "#3b82f6", name: "Count" }
  ]}
  xAxisKey="name"
  height={300}
/>
```

### Using PieChartComponent
```jsx
import { PieChartComponent } from "../Common";

<PieChartComponent
  data={[
    { name: "Type A", value: 300 },
    { name: "Type B", value: 200 },
  ]}
  dataKey="value"
  nameKey="name"
  height={320}
  colors={["#3b82f6", "#10b981", "#f59e0b"]}
/>
```

### Using AreaChartComponent
```jsx
import { AreaChartComponent } from "../Common";

<AreaChartComponent
  data={[
    { month: "Jan", revenue: 5000 },
    { month: "Feb", revenue: 7500 },
  ]}
  areas={[
    { 
      dataKey: "revenue", 
      fill: "#3b82f6", 
      stroke: "#1e40af", 
      name: "Revenue" 
    }
  ]}
  xAxisKey="month"
  height={350}
/>
```

## 📊 Color Palette

Use these colors consistently across charts:

```javascript
const colors = {
  blue: "#3b82f6",
  green: "#10b981",
  yellow: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
  pink: "#ec4899",
  gray: "#e5e7eb",
};
```

## 📈 Data Format

### For Line Charts
```javascript
[
  { month: "Jan", metric1: 100, metric2: 200 },
  { month: "Feb", metric1: 150, metric2: 250 },
]
```

### For Bar Charts
```javascript
[
  { category: "A", value1: 100, value2: 200 },
  { category: "B", value1: 150, value2: 250 },
]
```

### For Pie Charts
```javascript
[
  { name: "Category A", value: 300 },
  { name: "Category B", value: 200 },
]
```

### For Area Charts
```javascript
[
  { month: "Jan", value: 5000 },
  { month: "Feb", value: 7500 },
]
```

## 🎨 Chart Configuration

### Line Configuration
```javascript
{
  dataKey: "sales",      // Column name from data
  stroke: "#3b82f6",     // Line color
  name: "Sales",         // Legend label
}
```

### Bar Configuration
```javascript
{
  dataKey: "value",      // Column name from data
  fill: "#3b82f6",       // Bar color
  name: "Count",         // Legend label
}
```

## 🔧 Common Props

All chart components accept:
- `data` - Array of data objects
- `height` - Chart height in pixels (default: 300)
- `margin` - { top, right, bottom, left } (default: provided)

## 📐 Responsive Sizing

All charts use `ResponsiveContainer` from Recharts:
- **Width**: Always 100% (responsive)
- **Height**: Set via `height` prop
- **Margins**: Automatically adjusted for labels

## 💡 Tips

1. **Multiple Lines/Bars**: Pass array of configs
2. **Color Consistency**: Use predefined color palette
3. **Data Validation**: Ensure data has xAxisKey field
4. **Performance**: Recharts handles up to 1000+ data points
5. **Customization**: All components accept custom margins

## 🚀 Common Patterns

### Dual Metric Bar Chart
```jsx
<BarChartComponent
  data={data}
  bars={[
    { dataKey: "leads", fill: "#3b82f6", name: "Leads" },
    { dataKey: "conversions", fill: "#10b981", name: "Conversions" }
  ]}
  xAxisKey="country"
/>
```

### Multi-line Trend
```jsx
<LineChartComponent
  data={trendData}
  lines={[
    { dataKey: "new", stroke: "#3b82f6", name: "New" },
    { dataKey: "contacted", stroke: "#10b981", name: "Contacted" },
    { dataKey: "converted", stroke: "#8b5cf6", name: "Converted" }
  ]}
  xAxisKey="month"
/>
```

### Distribution View
```jsx
<PieChartComponent
  data={statusData}
  dataKey="value"
  nameKey="status"
  colors={["#3b82f6", "#10b981", "#f59e0b", "#ef4444"]}
/>
```

## 📱 Responsive Design

All charts automatically:
- ✅ Resize on window change
- ✅ Reflow on mobile
- ✅ Stack on small screens
- ✅ Maintain aspect ratio

## 🔍 Debugging

### Chart Not Showing?
1. Check data array is not empty
2. Verify xAxisKey matches field in data
3. Check dataKey exists in data objects
4. Ensure height prop is set

### Rendering Issues?
1. Console check for errors
2. Verify data structure
3. Check color codes are valid
4. Ensure Recharts is imported

## 📚 Example: Complete Analytics Section

```jsx
import { useState } from "react";
import { TimeRangeFilter, StatCard, ChartContainer, LineChartComponent } from "../Common";
import { TrendingUp } from "lucide-react";
import { myAnalyticsData } from "../../utils/myAnalyticsData";

const MyAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Analytics</h2>
        </div>
        <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          icon={TrendingUp}
          label="Total Sales"
          value="$5,234"
          trend="+12%"
          trendDirection="up"
        />
      </div>

      {/* Chart */}
      <ChartContainer title="Sales Trend" description="Monthly sales data">
        <LineChartComponent
          data={myAnalyticsData}
          lines={[{ dataKey: "sales", stroke: "#3b82f6", name: "Sales" }]}
          xAxisKey="month"
          height={350}
        />
      </ChartContainer>
    </div>
  );
};

export default MyAnalytics;
```

## 🎓 Learning Path

1. **Start Simple**: Use single-metric BarChart
2. **Add Complexity**: Multi-line LineChart
3. **Try Distributions**: PieChart
4. **Master Trends**: AreaChart with multiple areas
5. **Combine Everything**: Full analytics section

---

**Need Help?** Check PHASE2_DOCUMENTATION.md for more details.
