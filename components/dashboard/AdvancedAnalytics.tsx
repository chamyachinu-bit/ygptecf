'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type MonthlyAnalyticsPoint = {
  month: string
  events: number
  funded: number
  completed: number
  plannedBudget: number
  actualBudget: number
  donations: number
}

type StatusSlice = {
  name: string
  value: number
  color: string
}

type RegionAnalyticsPoint = {
  region: string
  events: number
  plannedBudget: number
  actualBudget: number
}

type GoalAnalyticsPoint = {
  goal: string
  events: number
}

interface AdvancedAnalyticsProps {
  monthlyData: MonthlyAnalyticsPoint[]
  statusData: StatusSlice[]
  regionData: RegionAnalyticsPoint[]
  goalData: GoalAnalyticsPoint[]
}

function formatINR(value: number) {
  return `₹${Number(value).toLocaleString('en-IN')}`
}

export function AdvancedAnalytics({
  monthlyData,
  statusData,
  regionData,
  goalData,
}: AdvancedAnalyticsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Event Movement</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="events" stroke="#2563eb" strokeWidth={2} name="Events" />
              <Line type="monotone" dataKey="funded" stroke="#16a34a" strokeWidth={2} name="Funded" />
              <Line type="monotone" dataKey="completed" stroke="#0f766e" strokeWidth={2} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Budget Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatINR(Number(value))} />
              <Legend />
              <Bar dataKey="plannedBudget" name="Planned Budget" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actualBudget" name="Actual Budget" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="donations" name="Donations" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                outerRadius={95}
                innerRadius={48}
                paddingAngle={3}
              >
                {statusData.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goals and Region Comparison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={goalData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="goal" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="events" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={regionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="region" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatINR(Number(value))} />
              <Legend />
              <Bar dataKey="plannedBudget" name="Planned" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actualBudget" name="Actual" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
