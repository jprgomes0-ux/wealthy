"use client"

import { useState } from "react"
import "../style/Assets.css"

interface SearchBarProps {
  onSearch: (query: string) => void
  query?: string
}

export default function SearchBar({ onSearch, query = "" }: SearchBarProps) {
  const [value, setValue] = useState(query)

  return (
    <div className="asset-search-wealthy" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Pesquisar ação, ETF ou cripto..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          className="btn-wealthy"
          onClick={() => onSearch(value)}
          disabled={value.length < 2}
        >
          Pesquisar
        </button>
      </div>

      {/* Mensagem de instrução */}
      {value.length > 0 && value.length < 2 && (
        <div style={{ padding: 8, color: "#888", fontSize: 12 }}>
          Digite pelo menos 2 caracteres para pesquisar
        </div>
      )}
    </div>
  )
}