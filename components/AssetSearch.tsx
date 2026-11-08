"use client"

import { useState } from "react"
import { searchAssets } from "../services/finnhub"
import { Asset } from "../types"
import "../style/Assets.css"

interface AssetSearchProps {
  onSelect: (asset: Asset) => void
}

export default function AssetSearch({ onSelect }: AssetSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (query.length < 2) return
    setLoading(true)
    try {
      const data: Asset[] = await searchAssets(query)
      setResults(data || [])
    } catch (err) {
      console.error("Erro ao buscar ativos:", err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="asset-search-wealthy">
      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Pesquisar ação, ETF ou cripto..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="btn-wealthy"
          onClick={handleSearch}
          disabled={query.length < 2 || loading}
        >
          {loading ? "Pesquisando..." : "Pesquisar"}
        </button>
      </div>

      <div className="asset-search-results-wealthy">
        {query.length >= 2 && results.length === 0 && !loading && (
          <div style={{ padding: 8, color: "#888" }}>Nenhum resultado encontrado</div>
        )}
        {results.map((r) => (
          <div
            key={r.symbol}
            className="asset-search-item-wealthy"
            onClick={() => onSelect(r)}
          >
            {r.description} ({r.symbol})
          </div>
        ))}
      </div>
    </div>
  )
}