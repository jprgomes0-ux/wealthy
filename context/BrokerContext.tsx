"use client"

import { createContext, useState, ReactNode, useEffect } from "react"
import { Broker } from "../types"
import { supabase } from "../lib/supabase"
import { useAuth } from "./AuthContext"

type BrokerContextType = {
  brokers: Broker[]
  addBroker: (name: string) => Promise<void>
  removeBroker: (id: string) => Promise<void>
}

export const BrokerContext = createContext<BrokerContextType | undefined>(undefined)

export function BrokerProvider({ children }: { children: ReactNode }) {
  const [brokers, setBrokers] = useState<Broker[]>([])
  const { user } = useAuth()

  // Carrega brokers do usuário logado
  useEffect(() => {
    if (!user) return

    const loadBrokers = async () => {
      const { data, error } = await supabase
        .from("brokers")
        .select("*")
        .eq("user_id", user.id) // filtra pelo usuário logado

      if (error) {
        console.error(error)
        return
      }

      if (data) setBrokers(data)
    }

    loadBrokers()
  }, [user])

  // Adiciona um broker
  const addBroker = async (name: string) => {
    if (!user) return

    const { data, error } = await supabase
      .from("brokers")
      .insert({ name, user_id: user.id }) // envia user_id
      .select()

    if (error) {
      console.error(error)
      return
    }

    if (data) setBrokers((prev) => [...prev, ...data])
  }

  // Remove um broker
  const removeBroker = async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from("brokers")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id) // garante que só remove os dados do usuário logado

    if (error) {
      console.error(error)
      return
    }

    setBrokers((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <BrokerContext.Provider value={{ brokers, addBroker, removeBroker }}>
      {children}
    </BrokerContext.Provider>
  )
}