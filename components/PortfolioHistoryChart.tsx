"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts"
import { useMemo } from "react"

interface HistoryData {
  date: string
  totalValue: number
}

interface PortfolioHistoryChartProps {
  history: HistoryData[]
}

export default function PortfolioHistoryChart({ history = [] }: PortfolioHistoryChartProps) {
  // Calcula dados do gráfico apenas quando history muda
  const chartData = useMemo(() => {
    if (history.length === 0) return [{ date: "00:00", totalValue: 0.01 }]
    return history
  }, [history])

  return (
    <div
      style={{
        width: "100%",
        height: 300,
        padding: 16,
        borderRadius: 10,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        background: "white",
        marginBottom: 24,
        border: "1px solid #ccc"
      }}
    >
      <h3 style={{ marginBottom: 10 }}>📈 Evolução do Portfólio</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => `$${Number(value ?? 0).toFixed(2)}`} />
          <Line type="monotone" dataKey="totalValue" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}