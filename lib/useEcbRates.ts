"use client"

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"

type RateRow = { date: string; currency: string; rate: number | ""; rateDate?: string }

// Um pedido por data + moeda, partilhado por todas as linhas e pelas duas calculadoras
const cache = new Map<string, Promise<{ rate: number; date: string }>>()

function fetchRate(date: string, currency: string) {
  const key = `${date}|${currency}`
  let p = cache.get(key)
  if (!p) {
    p = fetch(`/api/fx?date=${date}&currency=${currency}`).then(r => (r.ok ? r.json() : Promise.reject()))
    p.catch(() => cache.delete(key))
    cache.set(key, p)
  }
  return p
}

// Preenche sozinho o câmbio BCE das linhas em moeda estrangeira que ainda não o têm.
// Devolve uma mensagem por linha (a carregar / falhou) e uma função para limpar o estado.
export function useEcbRates<T extends RateRow>(rows: T[], setRows: Dispatch<SetStateAction<T[]>>) {
  const [status, setStatus] = useState<Record<number, string>>({})
  const requested = useRef(new Set<string>())

  useEffect(() => {
    rows.forEach((t, i) => {
      if (t.currency === "EUR" || t.rate !== "" || !t.date) return
      const key = `${i}|${t.date}|${t.currency}`
      if (requested.current.has(key)) return
      requested.current.add(key)
      setStatus(s => ({ ...s, [i]: "A obter câmbio…" }))
      fetchRate(t.date, t.currency)
        .then(d => {
          setRows(prev =>
            prev.map((p, j) =>
              j === i && p.date === t.date && p.currency === t.currency && p.rate === ""
                ? { ...p, rate: d.rate, rateDate: d.date }
                : p
            )
          )
          setStatus(s => ({ ...s, [i]: "" }))
        })
        .catch(() => setStatus(s => ({ ...s, [i]: "Sem ligação ao BCE. Escreve o câmbio à mão." })))
    })
  }, [rows, setRows])

  const reset = useCallback(() => {
    requested.current.clear()
    setStatus({})
  }, [])
  const clearRow = useCallback((i: number) => setStatus(s => ({ ...s, [i]: "" })), [])

  return { status, reset, clearRow }
}
