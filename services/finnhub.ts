import { Asset, SearchResult } from "../types"

// Pesquisa feita através da rota /api/search, para a chave do Finnhub ficar no servidor
export async function searchAssets(query: string): Promise<Asset[]> {
  if (!query || query.length < 2) return []

  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) return []

  const results: SearchResult[] = await res.json()
  return results.map(r => ({
    symbol: r.symbol,
    description: r.description,
    type: r.type,
    quantity: 0,
    purchasePrice: 0,
    brokerId: "",
  }))
}
