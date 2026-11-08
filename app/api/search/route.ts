import { NextRequest, NextResponse } from "next/server"
import { searchCoins } from "../../../lib/coingecko"
import { SearchResult } from "../../../types"

const FINNHUB_KEY = process.env.FINNHUB_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_KEY

type FinnhubSearchResult = {
  description: string
  displaySymbol: string
  symbol: string
  type: string
}

async function searchFinnhub(query: string): Promise<SearchResult[]> {
  if (!FINNHUB_KEY) throw new Error("FINNHUB_KEY não definida")
  const res = await fetch(
    `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_KEY}`
  )
  if (!res.ok) throw new Error("Finnhub search failed")
  const data: { result?: FinnhubSearchResult[] } = await res.json()
  return (data.result ?? []).map(r => ({
    symbol: r.symbol,
    description: r.description,
    type: r.type.toLowerCase().includes("crypto") ? "crypto" : "Common Stock",
  }))
}

async function searchCrypto(query: string): Promise<SearchResult[]> {
  const coins = await searchCoins(query)
  return coins.slice(0, 5).map(c => ({
    symbol: c.symbol.toUpperCase(),
    description: `${c.name} (cripto)`,
    type: "crypto",
  }))
}

// GET /api/search?q=apple  ->  SearchResult[]
export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim()
  if (query.length < 2) return NextResponse.json([])

  const [stocks, cryptos] = await Promise.allSettled([searchFinnhub(query), searchCrypto(query)])
  if (stocks.status === "rejected") console.error("Erro na pesquisa Finnhub:", stocks.reason)
  if (cryptos.status === "rejected") console.error("Erro na pesquisa CoinGecko:", cryptos.reason)

  const results: SearchResult[] = [
    ...(cryptos.status === "fulfilled" ? cryptos.value : []),
    ...(stocks.status === "fulfilled" ? stocks.value : []),
  ]
  return NextResponse.json(results)
}
