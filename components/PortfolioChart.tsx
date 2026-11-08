"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { useMemo } from "react"

interface Asset {
  symbol: string
  quantity: number
  purchasePrice: number
  currentPrice?: number
}

interface Props {
  portfolio?: Asset[]
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"]

export default function PortfolioChart({ portfolio }: Props) {
  const data = useMemo(() => {
    const safePortfolio = portfolio ?? []

    if (safePortfolio.length === 0) return [{ name: "Sem ativos", value: 1 }]

    return safePortfolio.map(asset => ({
      name: asset.symbol,
      value: Math.max(Number(asset.currentPrice ?? asset.purchasePrice ?? 0) * asset.quantity, 0.01)
    }))
  }, [portfolio])

  const outerRadius = 100

  return (
    <div className="portfolio-chart">
      <h3>📊 Distribuição do Portfólio</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={outerRadius}
            label
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(
              value: number | string | readonly (number | string)[] | undefined
            ) => {
              if (Array.isArray(value)) return `$${Number(value[0] ?? 0).toFixed(2)}`
              return `$${Number(value ?? 0).toFixed(2)}`
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}