"use client"

import { useState, useEffect, useMemo } from "react"

const STOCK_REFRESH_MS = 60_000 // plano gratuito da Twelve Data tem limite de pedidos por minuto
const CRYPTO_REFRESH_MS = 30_000

function usePolledPrices(endpoint: string, symbolsKey: string, intervalMs: number) {
  const [prices, setPrices] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!symbolsKey) return
    let mounted = true

    const fetchPrices = async () => {
      try {
        const res = await fetch(`${endpoint}?symbols=${encodeURIComponent(symbolsKey)}`)
        if (!res.ok) return
        const data: Record<string, number> = await res.json()
        if (mounted) setPrices(data)
      } catch (err) {
        console.error(`Erro ao buscar preços (${endpoint}):`, err)
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, intervalMs)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [endpoint, symbolsKey, intervalMs])

  return prices
}

export const useRealtimePrices = (
  assets: { symbol: string; type: "Common Stock" | "crypto" }[]
) => {
  // Chaves em texto: só mudam quando os símbolos mudam, não a cada render
  const stockKey = useMemo(
    () => Array.from(new Set(assets.filter(a => a.type === "Common Stock").map(a => a.symbol))).sort().join(","),
    [assets]
  )
  const cryptoKey = useMemo(
    () => Array.from(new Set(assets.filter(a => a.type === "crypto").map(a => a.symbol))).sort().join(","),
    [assets]
  )

  const stockPrices = usePolledPrices("/api/stock-prices", stockKey, STOCK_REFRESH_MS)
  const cryptoPrices = usePolledPrices("/api/crypto-prices", cryptoKey, CRYPTO_REFRESH_MS)

  return { stockPrices, cryptoPrices }
}
