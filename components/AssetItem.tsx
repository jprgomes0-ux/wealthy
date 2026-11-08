"use client"

import { useState, useContext } from "react"
import { PortfolioContext } from "../context/PortfolioContext"
import { BrokerContext } from "../context/BrokerContext"
import { Asset } from "../types"
import "../style/Assets.css"
import toast from "react-hot-toast"

interface AssetItemProps {
  asset: Asset
}

export default function AssetItem({ asset }: AssetItemProps) {
  // 🔹 Hooks sempre no topo
  const portfolioCtx = useContext(PortfolioContext)
  const brokerCtx = useContext(BrokerContext)

  const [quantity, setQuantity] = useState(1)
  const [purchasePrice, setPurchasePrice] = useState(asset.currentPrice ?? 0)
  const [selectedBroker, setSelectedBroker] = useState("")
  const [addingBroker, setAddingBroker] = useState(false)
  const [newBrokerName, setNewBrokerName] = useState("")

  // 🔹 Early return só depois de hooks
  if (!portfolioCtx || !brokerCtx) return null

  const { addAsset } = portfolioCtx
  const { brokers, addBroker } = brokerCtx

  const isValid = selectedBroker && quantity > 0 && purchasePrice > 0
  const totalInvested = (quantity * purchasePrice).toFixed(2)

  // Adiciona novo broker
  const handleAddBroker = () => {
    const trimmed = newBrokerName.trim()
    if (!trimmed) {
      toast.error("O nome do broker não pode estar vazio")
      return
    }
    if (brokers.some(b => b.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Broker já existe")
      return
    }

    addBroker(trimmed)
    setAddingBroker(false)
    setNewBrokerName("")
    toast.success(`Broker "${trimmed}" adicionado!`)
  }

const handleAddAsset = async () => {
  if (!isValid) {
    toast.error("Selecione um broker e preencha todos os campos")
    return
  }

  const assetToAdd: Asset = {
    ...asset,
    quantity,
    purchasePrice,
    brokerId: selectedBroker,
    type: asset.type // já é "Common Stock" ou "crypto"
  }

  await addAsset(assetToAdd)

  setQuantity(1)
  setPurchasePrice(asset.currentPrice ?? 0)
  setSelectedBroker("")
  toast.success(`Comprado ${quantity}x ${asset.symbol} por $${totalInvested}`)
}

  return (
    <div className="asset-item-card-wealthy">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontWeight: 700 }}>{asset.symbol}</h2>
        <span style={{ fontSize: 12, color: "#888" }}>{asset.description}</span>
      </div>

      {/* Seleção de Broker */}
      <div>
        <label>Broker</label>
        {!addingBroker ? (
          <select
            value={selectedBroker}
            onChange={(e) => {
              if (e.target.value === "__add_new__") {
                setAddingBroker(true)
                setSelectedBroker("")
              } else {
                setSelectedBroker(e.target.value)
              }
            }}
          >
            <option value="">Selecione um broker</option>
            {brokers.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
            <option value="__add_new__">+ Adicionar novo broker...</option>
          </select>
        ) : (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input
              type="text"
              placeholder="Nome do broker"
              value={newBrokerName}
              onChange={(e) => setNewBrokerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBroker()}
              style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
            />
            <button
              className="btn-wealthy"
              onClick={handleAddBroker}
              style={{ padding: "6px 12px", fontSize: 14 }}
            >
              Adicionar
            </button>
          </div>
        )}
      </div>

      {/* Quantidade */}
      <div>
        <label>Quantidade</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </div>

      {/* Preço */}
      <div>
        <label>Preço por unidade</label>
        <input
          type="number"
          min={0.01}
          step={0.01}
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(Number(e.target.value))}
        />
      </div>

      <p style={{ fontWeight: 600 }}>Total: ${totalInvested}</p>

      <button className="btn-wealthy" onClick={handleAddAsset} disabled={!isValid}>
        Comprar
      </button>
    </div>
  )
}