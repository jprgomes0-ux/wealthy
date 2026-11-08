// Só para uso no servidor (rotas em app/api).
// A app guarda símbolos (ex.: "BTC"); o CoinGecko precisa de ids (ex.: "bitcoin").
export type CryptoPrices = Record<string, { usd: number }>

type CoinGeckoSearchCoin = {
  id: string
  name: string
  symbol: string
  market_cap_rank: number | null
}

const idCache: Record<string, string | null> = {}

// Aceita "BTC", "btc", "BINANCE:BTCUSDT", "BTC-USD"
export function normalizeCryptoSymbol(symbol: string): string {
  let s = symbol.toUpperCase()
  if (s.includes(":")) s = s.split(":")[1]
  s = s.replace(/[-/]?(USDT|USDC|USD|EUR)$/, "")
  return s
}

export async function searchCoins(query: string): Promise<CoinGeckoSearchCoin[]> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) throw new Error("CoinGecko search failed")
  const data = await res.json()
  return (data?.coins ?? []) as CoinGeckoSearchCoin[]
}

async function resolveCoinId(symbol: string): Promise<string | null> {
  const s = normalizeCryptoSymbol(symbol)
  if (s in idCache) return idCache[s]

  const coins = await searchCoins(s)
  const matches = coins
    .filter(c => c.symbol.toUpperCase() === s)
    .sort((a, b) => (a.market_cap_rank ?? Infinity) - (b.market_cap_rank ?? Infinity))

  const id = matches[0]?.id ?? null
  idCache[s] = id
  return id
}

// Recebe símbolos e devolve preços em USD indexados pelo símbolo original
export async function getCryptoPrices(symbols: string[]): Promise<CryptoPrices> {
  if (!symbols.length) return {}

  const pairs = await Promise.all(
    symbols.map(async symbol => [symbol, await resolveCoinId(symbol)] as const)
  )
  const ids = Array.from(new Set(pairs.map(([, id]) => id).filter((id): id is string => !!id)))
  if (!ids.length) return {}

  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
    { cache: "no-store" }
  )
  if (!res.ok) throw new Error("CoinGecko request failed")
  const byId: Record<string, { usd: number }> = await res.json()

  const result: CryptoPrices = {}
  for (const [symbol, id] of pairs) {
    if (id && byId[id]?.usd != null) result[symbol] = { usd: byId[id].usd }
  }
  return result
}
