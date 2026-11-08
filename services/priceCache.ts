type PriceCacheEntry = {
  price: number
  timestamp: number
}

type PriceCache = Record<string, PriceCacheEntry>

const cache: PriceCache = {}

const CACHE_TTL = 60000 // 60 segundos

export function getCachedPrice(symbol: string): number | null {
  const entry = cache[symbol]

  if (!entry) return null

  const age = Date.now() - entry.timestamp

  if (age < CACHE_TTL) {
    return entry.price
  }

  return null
}

export function setCachedPrice(symbol: string, price: number) {
  cache[symbol] = {
    price,
    timestamp: Date.now()
  }
}

export function setMultiplePrices(prices: Record<string, number>) {
  const now = Date.now()

  Object.entries(prices).forEach(([symbol, price]) => {
    cache[symbol] = {
      price,
      timestamp: now
    }
  })
}