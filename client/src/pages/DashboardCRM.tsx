import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, CheckCircle2, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock data para TailAdmin CRM demo
const heroMetrics = [
  {
    value: "$120,369",
    label: "Active Deal",
    change: "+20%",
    changeLabel: "last month",
    isPositive: true,
    gradient: "from-[#3C50E0] to-[#6571F3]",
  },
  {
    value: "$234,210",
    label: "Revenue Total",
    change: "+9.0%",
    changeLabel: "last month",
    isPositive: true,
    gradient: "from-[#10B981] to-[#34D399]",
  },
  {
    value: "874",
    label: "Closed Deals",
    change: "-4.5%",
    changeLabel: "last month",
    isPositive: false,
    gradient: "from-[#F59E0B] to-[#FBBF24]",
  },
];

const statisticsData = [
  { month: "Jan", value1: 200, value2: 100 },
  { month: "Feb", value1: 180, value2: 120 },
  { month: "Mar", value1: 220, value2: 110 },
  { month: "Apr", value1: 200, value2: 130 },
  { month: "May", value1: 210, value2: 120 },
  { month: "Jun", value1: 230, value2: 140 },
  { month: "Jul", value1: 220, value2: 130 },
  { month: "Aug", value1: 240, value2: 150 },
  { month: "Sep", value1: 230, value2: 140 },
  { month: "Oct", value1: 250, value2: 160 },
  { month: "Nov", value1: 240, value2: 150 },
  { month: "Dec", value1: 260, value2: 170 },
];

const revenueCategories = [
  { name: "Marketing", value: "$30,569.00", percentage: 85, color: "#3C50E0" },
  { name: "Sales", value: "$20,486.00", percentage: 55, color: "#10B981" },
];

const upcomingSchedule = [
  {
    date: "Wed, 11 Jan",
    time: "09:20 AM",
    title: "Business Analytics Press",
    description: "Exploring the Future of Data-Driven",
    moreCount: 6,
  },
  {
    date: "Fri, 15 Feb",
    time: "10:35 AM",
    title: "Business Sprint",
    description: "Techniques from Business Sprint",
    moreCount: 2,
  },
  {
    date: "Thu, 18 Mar",
    time: "1:15 AM",
    title: "Customer Review Meeting",
    description: "Insights from the Customer Review Meeting",
    moreCount: 8,
  },
];

const recentOrders = [
  {
    dealId: "DE124321",
    customer: { name: "John Doe", email: "johndoe@gmail.com", initials: "JD" },
    product: "Software License",
    value: "$18,50.34",
    closeDate: "2024-06-15",
    status: "Complete",
  },
  {
    dealId: "DE124322",
    customer: { name: "Jane Smith", email: "janesmith@gmail.com", initials: "JS" },
    product: "Cloud Hosting",
    value: "$12,99.00",
    closeDate: "2024-06-18",
    status: "Pending",
  },
  {
    dealId: "DE124323",
    customer: { name: "Michael Brown", email: "michaelbrown@gmail.com", initials: "MB" },
    product: "Web Domain",
    value: "$9,50.00",
    closeDate: "2024-06-20",
    status: "Cancel",
  },
  {
    dealId: "DE124324",
    customer: { name: "Alice Johnson", email: "alicejohnson@gmail.com", initials: "AJ" },
    product: "SSL Certificate",
    value: "$2,30.45",
    closeDate: "2024-06-25",
    status: "Pending",
  },
  {
    dealId: "DE124325",
    customer: { name: "Robert Lee", email: "robertlee@gmail.com", initials: "RL" },
    product: "Premium Support",
    value: "$15,20.00",
    closeDate: "2024-06-30",
    status: "Complete",
  },
];

export default function DashboardCRM() {
  const [activeTab, setActiveTab] = useState("monthly");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Hero Metrics - 3 Cards TailAdmin Style */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {heroMetrics.map((metric, index) => (
          <Card 
            key={index} 
            className={`relative overflow-hidden rounded-xl border-none bg-gradient-to-br ${metric.gradient} text-white shadow-default`}
            data-testid={`card-metric-${index}`}
          >
            {/* Texture Overlay - TailAdmin exact pattern */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 pointer-events-none opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                backgroundSize: '8px 8px',
                maskImage: 'linear-gradient(to bottom left, black, transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom left, black, transparent)',
              }} />
            </div>

            <CardContent className="px-7.5 py-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-3xl font-bold mb-1" data-testid={`text-value-${index}`}>
                    {metric.value}
                  </h4>
                  <span className="text-sm text-white/90" data-testid={`text-label-${index}`}>
                    {metric.label}
                  </span>
                </div>
                <div className="h-11.5 w-11.5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2">
                <Badge 
                  variant={metric.isPositive ? "default" : "destructive"}
                  className={`${metric.isPositive ? 'bg-white/20 text-white' : 'bg-white/20 text-white'} border-none`}
                  data-testid={`badge-change-${index}`}
                >
                  {metric.isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {metric.change}
                </Badge>
                <span className="text-xs text-white/90">{metric.changeLabel}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Statistics Chart & Estimated Revenue */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Statistics Chart - 2/3 width */}
        <Card className="lg:col-span-2 rounded-xl border border-stroke dark:border-strokedark shadow-default" data-testid="card-statistics">
          <CardHeader className="border-b border-stroke dark:border-strokedark px-7.5 py-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-title-md font-bold text-black dark:text-white">
                  Statistics
                </CardTitle>
                <p className="text-sm text-body mt-1">Target you've set for each month</p>
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-whiter dark:bg-meta-4">
                  <TabsTrigger value="monthly" className="text-sm" data-testid="tab-monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="quarterly" className="text-sm" data-testid="tab-quarterly">Quarterly</TabsTrigger>
                  <TabsTrigger value="annually" className="text-sm" data-testid="tab-annually">Annually</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          
          <CardContent className="px-5 pb-5 pt-7.5">
            {/* Profit Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <h4 className="text-2xl font-bold text-black dark:text-white">$212,142.12</h4>
                <p className="text-sm text-body">Avg. Yearly Profit</p>
                <Badge variant="default" className="bg-meta-3 text-white mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +23.2%
                </Badge>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-black dark:text-white">$30,321.23</h4>
                <p className="text-sm text-body">Avg. Yearly Profit</p>
                <Badge variant="destructive" className="mt-1">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  -12.3%
                </Badge>
              </div>
            </div>

            {/* Area Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={statisticsData}>
                <defs>
                  <linearGradient id="colorValue1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3C50E0" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3C50E0" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorValue2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#80CAEE" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#80CAEE" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" stroke="#E2E8F0" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  domain={[0, 300]}
                  ticks={[0, 50, 100, 150, 200, 250]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value1" 
                  stroke="#3C50E0" 
                  strokeWidth={2}
                  fill="url(#colorValue1)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="value2" 
                  stroke="#80CAEE" 
                  strokeWidth={2}
                  fill="url(#colorValue2)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Estimated Revenue Gauge - 1/3 width */}
        <Card className="rounded-xl border border-stroke dark:border-strokedark shadow-default" data-testid="card-revenue">
          <CardHeader className="border-b border-stroke dark:border-strokedark px-7.5 py-5">
            <CardTitle className="text-title-md font-bold text-black dark:text-white">
              Estimated Revenue
            </CardTitle>
            <p className="text-sm text-body mt-1">Target you've set for each month</p>
          </CardHeader>
          
          <CardContent className="px-7.5 py-6">
            {/* Circular Gauge - Simplified version */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="relative w-48 h-48 mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="#E2E8F0"
                    strokeWidth="16"
                    fill="none"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="#3C50E0"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 80 * 0.7} ${2 * Math.PI * 80}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <h3 className="text-4xl font-bold text-black dark:text-white">$90</h3>
                  <p className="text-sm text-body">June Goals</p>
                </div>
              </div>
            </div>

            {/* Revenue Categories */}
            <div className="space-y-4">
              {revenueCategories.map((category, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-black dark:text-white">{category.name}</span>
                    <span className="text-sm font-medium text-black dark:text-white">{category.percentage}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress 
                      value={category.percentage} 
                      className="h-2 flex-1" 
                      style={{ 
                        backgroundColor: '#E2E8F0',
                      }}
                    />
                  </div>
                  <p className="text-xs text-body mt-1">{category.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Category & Upcoming Schedule */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Sales Category */}
        <Card className="rounded-xl border border-stroke dark:border-strokedark shadow-default" data-testid="card-sales">
          <CardHeader className="border-b border-stroke dark:border-strokedark px-7.5 py-5">
            <CardTitle className="text-title-md font-bold text-black dark:text-white">
              Sales Category
            </CardTitle>
            <p className="text-sm text-body mt-1">Total 3.5K</p>
          </CardHeader>
          
          <CardContent className="px-7.5 py-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-primary"></div>
                  <div>
                    <h5 className="font-medium text-black dark:text-white">Affiliate Program</h5>
                    <p className="text-xs text-body">2,040 Products</p>
                  </div>
                </div>
                <span className="font-medium text-black dark:text-white">48%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-meta-3"></div>
                  <div>
                    <h5 className="font-medium text-black dark:text-white">Direct Buy</h5>
                    <p className="text-xs text-body">1,402 Products</p>
                  </div>
                </div>
                <span className="font-medium text-black dark:text-white">33%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-meta-2"></div>
                  <div>
                    <h5 className="font-medium text-black dark:text-white">Adsense</h5>
                    <p className="text-xs text-body">510 Products</p>
                  </div>
                </div>
                <span className="font-medium text-black dark:text-white">19%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Schedule */}
        <Card className="rounded-xl border border-stroke dark:border-strokedark shadow-default" data-testid="card-schedule">
          <CardHeader className="border-b border-stroke dark:border-strokedark px-7.5 py-5">
            <CardTitle className="text-title-md font-bold text-black dark:text-white">
              Upcoming Schedule
            </CardTitle>
          </CardHeader>
          
          <CardContent className="px-7.5 py-6">
            <div className="space-y-4">
              {upcomingSchedule.map((event, index) => (
                <div key={index} className="flex gap-4 pb-4 border-b border-stroke dark:border-strokedark last:border-0 last:pb-0">
                  <div className="flex-shrink-0">
                    <div className="h-11.5 w-11.5 rounded-full bg-meta-4/10 flex items-center justify-center">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-body">{event.date}</span>
                      <span className="text-xs text-body">{event.time}</span>
                    </div>
                    <h5 className="font-medium text-black dark:text-white mb-1">{event.title}</h5>
                    <p className="text-sm text-body">
                      {event.description} <span className="text-primary">+{event.moreCount} more</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card className="rounded-xl border border-stroke dark:border-strokedark shadow-default" data-testid="card-orders">
        <CardHeader className="border-b border-stroke dark:border-strokedark px-7.5 py-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-title-md font-bold text-black dark:text-white">
              Recent Orders
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-sm">
                Filter
              </Button>
              <Button variant="ghost" size="sm" className="text-sm text-primary">
                See all
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark bg-gray-2 dark:bg-meta-4">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-black dark:text-white">Deal ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-black dark:text-white">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-black dark:text-white">Product/Service</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-black dark:text-white">Deal Value</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-black dark:text-white">Close Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-black dark:text-white">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-black dark:text-white">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-stroke dark:border-strokedark last:border-0 hover:bg-gray-2/50 dark:hover:bg-meta-4/50"
                    data-testid={`row-order-${index}`}
                  >
                    <td className="px-4 py-4 text-sm font-medium text-black dark:text-white">{order.dealId}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">{order.customer.initials}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-black dark:text-white">{order.customer.name}</p>
                          <p className="text-xs text-body">{order.customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-body">{order.product}</td>
                    <td className="px-4 py-4 text-sm font-medium text-black dark:text-white">{order.value}</td>
                    <td className="px-4 py-4 text-sm text-body">{order.closeDate}</td>
                    <td className="px-4 py-4">
                      <Badge 
                        variant={
                          order.status === "Complete" ? "default" : 
                          order.status === "Pending" ? "secondary" : 
                          "destructive"
                        }
                        className="text-xs"
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Button variant="ghost" size="icon">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
