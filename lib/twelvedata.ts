// Só para uso no servidor (rotas em app/api). A chave nunca vai para o browser.
const API_KEY = process.env.TWELVEDATA_KEY ?? process.env.NEXT_PUBLIC_TWELVEDATA_KEY

export type StockPrices = Record<string, { price: string }>

export async function getStockPrices(symbols: string[]): Promise<StockPrices> {
  if (!symbols.length) return {}
  if (!API_KEY) throw new Error("TWELVEDATA_KEY não definida")

  const res = await fetch(
    `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbols.join(","))}&apikey=${API_KEY}`,
    { cache: "no-store" }
  )
  if (!res.ok) throw new Error("Twelve Data request failed")

  const data = await res.json()

  // Um símbolo: { price: "123.4" }. Vários: { AAPL: { price: "..." }, MSFT: { price: "..." } }
  if (symbols.length === 1) {
    return data?.price ? { [symbols[0]]: { price: data.price } } : {}
  }

  const result: StockPrices = {}
  for (const symbol of symbols) {
    const entry = data?.[symbol]
    if (entry?.price) result[symbol] = { price: entry.price }
  }
  return result
}
