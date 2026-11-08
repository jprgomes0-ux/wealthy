"use client"

import { useState } from "react"
import { Asset } from "../types"
import AssetItem from "./AssetItem"
import "../style/Assets.css"

interface AssetListProps {
  assets: Asset[]
  onSelect?: (asset: Asset) => void
}

export default function AssetList({ assets = [], onSelect }: AssetListProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)

  const handleClick = (asset: Asset) => {
    setSelectedSymbol(asset.symbol)
    onSelect?.(asset)
  }

  if (assets.length === 0) {
    return <div className="no-results">Nenhum resultado encontrado</div>
  }

  return (
    <div className="asset-list-wealthy">
      {assets.map(asset => {
        const isSelected = selectedSymbol === asset.symbol
        return (
          <div
            key={asset.symbol}
            className="asset-card-wealthy"
            onClick={() => handleClick(asset)}
            style={{ border: isSelected ? "2px solid var(--primary)" : "1px solid #ccc" }}
          >
            <AssetItem asset={asset} />
          </div>
        )
      })}
    </div>
  )
}