"use client"

import React, { useContext, useMemo, useCallback } from "react"
import { PortfolioContext } from "../context/PortfolioContext"
import { BrokerContext } from "../context/BrokerContext"
import PortfolioChart from "./PortfolioChart"
import "../style/Dashboard.css"
import { useRealtimePrices } from "../services/useRealtimePrices"
import { Asset, Broker } from "../types"

// Posição agrupada por ativo + broker, com os ids de cada compra
type GroupedAsset = Asset & { lotIds: string[] }

const AssetCard = React.memo(function AssetCard({
  asset,
  broker,
  onRemoveLot,
}: {
  asset: GroupedAsset
  broker?: Broker
  onRemoveLot: (id: string) => void
}) {
  const totalInvested = asset.purchasePrice * asset.quantity
  const currentTotal = (asset.currentPrice ?? asset.purchasePrice) * asset.quantity
  const profit = currentTotal - totalInvested
  const lastLotId = asset.lotIds[asset.lotIds.length - 1]
  const lots = asset.lotIds.length

  return (
    <div className="asset-card-wealthy">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <h3>{asset.symbol}</h3>
          <span>{broker?.name || "Sem broker"}</span>
        </div>
        <p>Preço médio: ${asset.purchasePrice.toFixed(2)} x {asset.quantity}</p>
        <p>Atual: ${(asset.currentPrice ?? asset.purchasePrice).toFixed(2)} x {asset.quantity}</p>
        <p className={profit >= 0 ? "profit-positive-wealthy" : "profit-negative-wealthy"}>
          Lucro: ${profit.toFixed(2)}
        </p>
        {lots > 1 && <p style={{ fontSize: 12, color: "#888" }}>{lots} compras</p>}
      </div>
      {lastLotId && (
        <button className="btn-delete-wealthy" onClick={() => onRemoveLot(lastLotId)}>
          🗑️ {lots > 1 ? "Eliminar última compra" : "Eliminar"}
        </button>
      )}
    </div>
  )
})

export default function Portfolio() {
  const portfolioCtx = useContext(PortfolioContext)
  const brokerCtx = useContext(BrokerContext)

  const portfolioRaw = useMemo(() => portfolioCtx?.portfolio ?? [], [portfolioCtx?.portfolio])
  const brokers = brokerCtx?.brokers ?? []
  const removeAsset = portfolioCtx?.removeAsset

  const priceInputs = useMemo(
    () => portfolioRaw.map(a => ({ symbol: a.symbol, type: a.type })),
    [portfolioRaw]
  )
  const { stockPrices, cryptoPrices } = useRealtimePrices(priceInputs)

  const groupedPortfolio = useMemo(() => {
    const map: Record<string, GroupedAsset> = {}
    portfolioRaw.forEach(raw => {
      const livePrice = raw.type === "Common Stock" ? stockPrices[raw.symbol] : cryptoPrices[raw.symbol]
      const asset = { ...raw, currentPrice: livePrice ?? raw.purchasePrice }
      const key = `${asset.symbol}-${asset.brokerId}`
      const existing = map[key]
      if (existing) {
        const totalQuantity = existing.quantity + asset.quantity
        const totalInvested = existing.purchasePrice * existing.quantity + asset.purchasePrice * asset.quantity
        map[key] = {
          ...existing,
          quantity: totalQuantity,
          purchasePrice: totalQuantity > 0 ? totalInvested / totalQuantity : 0,
          currentPrice: livePrice ?? existing.currentPrice,
          lotIds: asset.id ? [...existing.lotIds, asset.id] : existing.lotIds,
        }
      } else {
        map[key] = { ...asset, lotIds: asset.id ? [asset.id] : [] }
      }
    })
    return Object.values(map)
  }, [portfolioRaw, stockPrices, cryptoPrices])

  const totals = useMemo(() => {
    const totalInvested = groupedPortfolio.reduce((sum, a) => sum + a.purchasePrice * a.quantity, 0)
    const totalCurrent = groupedPortfolio.reduce((sum, a) => sum + (a.currentPrice ?? a.purchasePrice) * a.quantity, 0)
    const totalProfit = totalCurrent - totalInvested
    const totalProfitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0
    return { totalInvested, totalCurrent, totalProfit, totalProfitPercent }
  }, [groupedPortfolio])

  const handleRemoveLot = useCallback((id: string) => {
    removeAsset?.(id)
  }, [removeAsset])

  if (!portfolioCtx || !brokerCtx) return <div>Carregando...</div>

  return (
    <div className="dashboard-wealthy">
      <div className="dashboard-cards-wealthy">
        <div className="dashboard-card-wealthy">
          <p>💰 Investido</p>
          <h2>${totals.totalInvested.toFixed(2)}</h2>
        </div>
        <div className="dashboard-card-wealthy">
          <p>📊 Valor Atual</p>
          <h2>${totals.totalCurrent.toFixed(2)}</h2>
        </div>
        <div className="dashboard-card-wealthy">
          <p>📈 Lucro / Prejuízo</p>
          <h2 className={totals.totalProfit >= 0 ? "profit-positive-wealthy" : "profit-negative-wealthy"}>
            {totals.totalProfit >= 0 ? "▲" : "▼"} ${totals.totalProfit.toFixed(2)} ({totals.totalProfitPercent.toFixed(2)}%)
          </h2>
        </div>
      </div>

      <PortfolioChart portfolio={groupedPortfolio} />

      <div className="asset-list-wrapper-wealthy">
        <div className="asset-list-wealthy">
          {groupedPortfolio.map(asset => {
            const broker = brokers.find(b => b.id === asset.brokerId)
            return (
              <AssetCard
                key={`${asset.symbol}-${asset.brokerId}`}
                asset={asset}
                broker={broker}
                onRemoveLot={handleRemoveLot}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
