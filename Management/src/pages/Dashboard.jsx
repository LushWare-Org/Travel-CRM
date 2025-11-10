import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, MapPin, DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { saveAs } from "file-saver";

const Dashboard = () => {
  const leadData = [
    { month: "Jan", new: 45, contacted: 32, interested: 18, converted: 12 },
    { month: "Feb", new: 52, contacted: 38, interested: 24, converted: 16 },
    { month: "Mar", new: 48, contacted: 35, interested: 22, converted: 14 },
    { month: "Apr", new: 61, contacted: 45, interested: 30, converted: 20 },
    { month: "May", new: 55, contacted: 40, interested: 28, converted: 18 },
    { month: "Jun", new: 67, contacted: 50, interested: 35, converted: 24 },
  ];

  const revenueData = [
    { month: "Jan", revenue: 12000, target: 15000 },
    { month: "Feb", revenue: 15000, target: 15000 },
    { month: "Mar", revenue: 14000, target: 15000 },
    { month: "Apr", revenue: 18000, target: 15000 },
    { month: "May", revenue: 16500, target: 15000 },
    { month: "Jun", revenue: 19000, target: 15000 },
  ];

  const packageData = [
    { name: "Adventure", value: 35, fill: "#3b82f6" },
    { name: "Honeymoon", value: 25, fill: "#ec4899" },
    { name: "Family", value: 28, fill: "#10b981" },
    { name: "Corporate", value: 12, fill: "#f59e0b" },
  ];

  const stats = [
    { title: "Total Leads", value: "1,248", icon: Users, color: "bg-blue-500", trend: "+12%" },
    { title: "Active Packages", value: "42", icon: MapPin, color: "bg-green-500", trend: "+5%" },
    { title: "Monthly Revenue", value: "$19,000", icon: DollarSign, color: "bg-purple-500", trend: "+23%" },
    { title: "Conversion Rate", value: "18.5%", icon: TrendingUp, color: "bg-orange-500", trend: "+3%" },
  ];

  const exportToExcel = () => {
    // Build a consolidated CSV file 
    const rows = [];

    const pushSection = (title, data) => {
      rows.push([title]);
      if (!data || data.length === 0) {
        rows.push(["No data"]);
        rows.push([]);
        return;
      }
      const headers = Object.keys(data[0]);
      rows.push(headers);
      data.forEach((item) => {
        rows.push(headers.map((h) => (item[h] !== undefined && item[h] !== null ? String(item[h]) : "")));
      });
      rows.push([]);
    };

    pushSection("Lead Data", leadData);
    pushSection("Revenue Data", revenueData);
    pushSection(
      "Package Data",
      packageData.map(({ name, value }) => ({ name, value }))
    );
    pushSection(
      "Stats",
      stats.map(({ title, value, color, trend }) => ({ title, value, color, trend }))
    );

    const escapeCell = (cell) => {
      if (cell == null) return "";
      const s = String(cell);
      if (s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
      if (s.includes(",") || s.includes("\n") || s.includes("\r")) return '"' + s + '"';
      return s;
    };

    const csv = rows.map((r) => r.map(escapeCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "Dashboard_Report.csv");
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's your business overview.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              onClick={exportToExcel}
            >
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-green-600 font-semibold mt-2">{stat.trend} from last month</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Lead Funnel Chart */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Lead Conversion Funnel</h2>
            <p className="text-sm text-gray-600 mb-4">Monthly lead progression through sales stages</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={leadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb" }} />
                <Legend />
                <Line type="monotone" dataKey="new" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
                <Line type="monotone" dataKey="contacted" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} />
                <Line type="monotone" dataKey="interested" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b" }} />
                <Line type="monotone" dataKey="converted" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#8b5cf6" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Package Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Package Distribution</h2>
            <p className="text-sm text-gray-600 mb-4">Active packages by category</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={packageData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                  {packageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Revenue Performance</h2>
            <p className="text-sm text-gray-600 mb-4">Monthly revenue vs target</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb" }} />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="target" fill="#e5e7eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Quick Actions & Alerts</h2>
            <p className="text-sm text-gray-600 mb-4">Important tasks and notifications</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">5 pending follow-ups</p>
                  <p className="text-xs text-yellow-700">Due today</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">3 invoices paid</p>
                  <p className="text-xs text-green-700">This week</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">8 pending confirmations</p>
                  <p className="text-xs text-blue-700">Awaiting customer response</p>
                </div>
              </div>
              <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium mt-4">
                View All Tasks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;