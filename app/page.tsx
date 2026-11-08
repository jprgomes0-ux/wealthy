"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import Portfolio from "../components/Portfolio"
import Brokers from "../components/Brokers"
import AssetList from "../components/AssetList"
import SearchBar from "../components/SearchBar"
import UserProfile from "../components/UserProfile"
import { Asset } from "../types"
import { searchAssets } from "../services/finnhub"
import { useAuth } from "../context/AuthContext"
import LoginForm from "../components/LoginForm"
import ProfileSetup from "../components/ProfileSetup"

// Header com logo + abas integradas
function AppHeader({
  activeTab,
  onTabChange,
}: {
  activeTab: "portfolio" | "brokers" | "add" | "profile"
  onTabChange: (tab: typeof activeTab) => void
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: 1024,
        margin: "0 auto",
        padding: "16px 0",
        flexWrap: "wrap",
      }}
    >
      {/* Logo */}
      <Image
        src="/logo-wealthy.png"
        alt="Wealthy"
        width={300}
        height={150}
        priority
      />

      {/* Abas do dashboard */}
      <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
        {["portfolio", "brokers", "add", "profile"].map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab as typeof activeTab)}
            className={`tab-button ${activeTab === tab ? "active" : ""}`}
            style={{ fontWeight: 600 }}
          >
            {tab === "portfolio"
              ? "Portfolio"
              : tab === "brokers"
              ? "Brokers"
              : tab === "add"
              ? "Adicionar Ativo"
              : "Perfil"}
          </button>
        ))}
        <Link href="/calculadoras/mais-valias" className="tab-button" style={{ fontWeight: 600 }}>
          Calculadora IRS
        </Link>
      </div>
    </header>
  )
}

export default function Page() {
  const { user, profileExists, checkProfile } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [activeTab, setActiveTab] = useState<
    "portfolio" | "brokers" | "add" | "profile"
  >("portfolio")
  const [searchQuery, setSearchQuery] = useState("")

  // Checa perfil quando usuário loga
  useEffect(() => {
    if (user && !profileExists) {
      checkProfile()
    }
  }, [user, profileExists, checkProfile])

  // Mostra login se não estiver logado
  if (!user) return <LoginForm />

  // Mostra formulário de perfil se ainda não tiver perfil
  if (!profileExists) return <ProfileSetup />

  // Funções de abas e busca
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    if (tab !== "add") {
      setSearchQuery("")
      setAssets([])
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) return
    const results: Asset[] = await searchAssets(query)
    setAssets(results)
  }

  // Dashboard principal
  return (
    <div style={{ maxWidth: 1024, margin: "0 auto", padding: "16px" }}>
      <AppHeader activeTab={activeTab} onTabChange={handleTabChange} />

      <div style={{ marginTop: 16 }}>
        {activeTab === "portfolio" && <Portfolio />}
        {activeTab === "brokers" && <Brokers />}
        {activeTab === "add" && (
          <>
            <SearchBar query={searchQuery} onSearch={handleSearch} />
            <AssetList assets={assets} />
          </>
        )}
        {activeTab === "profile" && <UserProfile />}
      </div>
    </div>
  )
}
