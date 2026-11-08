"use client"

import { createContext, useState, ReactNode, useEffect, useContext, useCallback } from "react"
import { Asset, AssetPortfolio } from "../types"
import { supabase } from "../lib/supabase"
import { useAuth } from "./AuthContext"

type PortfolioContextType = {
  portfolio: AssetPortfolio
  addAsset: (asset: Asset) => Promise<void>
  removeAsset: (id: string) => Promise<void>
  getGroupedPortfolio: () => AssetPortfolio
}

export const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined)

type AssetDB = {
  id: string
  symbol: string
  type: "Common Stock" | "crypto"
  quantity: number
  purchase_price: number
  broker_id: string
  description?: string
  current_price?: number
}

const normalizeAsset = (d: AssetDB): Asset => ({
  id: d.id,
  symbol: d.symbol,
  type: d.type,
  quantity: Number(d.quantity),
  purchasePrice: Number(d.purchase_price),
  brokerId: d.broker_id,
  description: d.description,
  currentPrice: d.current_price ?? d.purchase_price
})

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolio, setPortfolio] = useState<AssetPortfolio>([])
  const { user } = useAuth()

  const loadPortfolio = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", user.id)

    if (error) {
      console.error("Erro ao carregar portfolio:", error)
      return
    }

    if (data) {
      const normalized = data.map(normalizeAsset)
      setPortfolio(normalized)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const fetchPortfolio = async () => await loadPortfolio()
    fetchPortfolio()
  }, [user, loadPortfolio])

  const addAsset = async (asset: Asset) => {
    if (!user) return
    if (!asset.symbol || asset.quantity == null || asset.purchasePrice == null) return
    if (!asset.brokerId || asset.brokerId.trim() === "") return

    const assetToInsert = {
      symbol: asset.symbol,
      type: asset.type,
      quantity: Number(asset.quantity),
      purchase_price: Number(asset.purchasePrice),
      broker_id: asset.brokerId,
      user_id: user.id
    }

    const { data, error } = await supabase
      .from("assets")
      .insert(assetToInsert)
      .select()

    if (data) setPortfolio(prev => [...prev, ...data.map(normalizeAsset)])
    if (error) console.error("Erro ao adicionar asset:", error)
  }

  // Remove uma única compra (linha da tabela assets), pelo id
  const removeAsset = async (id: string) => {
    if (!user) return
    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Erro ao remover asset:", error)
      return
    }
    setPortfolio(prev => prev.filter(a => a.id !== id))
  }

  const getGroupedPortfolio = useCallback(() => {
    const map: Record<string, Asset> = {}
    portfolio.forEach(asset => {
      const key = `${asset.symbol}-${asset.brokerId}`
      if (map[key]) {
        const existing = map[key]
        const totalQuantity = existing.quantity + asset.quantity
        const totalInvested =
          existing.purchasePrice * existing.quantity +
          asset.purchasePrice * asset.quantity
        const averagePrice = totalInvested / totalQuantity
        map[key] = {
          ...existing,
          quantity: totalQuantity,
          purchasePrice: averagePrice,
          currentPrice: asset.currentPrice ?? existing.currentPrice
        }
      } else {
        map[key] = { ...asset }
      }
    })
    return Object.values(map)
  }, [portfolio])

  return (
    <PortfolioContext.Provider value={{ portfolio, addAsset, removeAsset, getGroupedPortfolio }}>
      {children}
    </PortfolioContext.Provider>
  )
}

export const usePortfolio = () => {
  const context = useContext(PortfolioContext)
  if (!context) throw new Error("usePortfolio must be used within PortfolioProvider")
  return context
}