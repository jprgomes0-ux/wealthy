export type AssetType = "Common Stock" | "crypto"

export type Asset = {
  id?: string
  symbol: string
  type: AssetType
  quantity: number
  purchasePrice: number
  brokerId: string
  description?: string
  currentPrice?: number
}

export type AssetPortfolio = Asset[]

export type Broker = {
  id: string
  name: string
  user_id?: string
}

// Resultado de pesquisa devolvido por /api/search
export type SearchResult = {
  symbol: string
  description: string
  type: AssetType
}
