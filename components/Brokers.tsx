"use client"

import { useContext, useState } from "react"
import { BrokerContext } from "../context/BrokerContext"
import { AnimatePresence, motion } from "framer-motion"
import { XMarkIcon } from "@heroicons/react/24/solid"
import "../style/Brokers.css"

export default function Brokers() {
  const brokerCtx = useContext(BrokerContext)
  const [newBroker, setNewBroker] = useState("")
  const [error, setError] = useState<string | null>(null)

  if (!brokerCtx) return null
  const { brokers, addBroker, removeBroker } = brokerCtx

  const handleAddBroker = () => {
    const trimmed = newBroker.trim()
    if (!trimmed) return setError("O nome não pode estar vazio")
    if (brokers.some((b) => b.name.toLowerCase() === trimmed.toLowerCase()))
      return setError("Broker já existe")

    addBroker(trimmed)
    setNewBroker("")
    setError(null)
  }

  return (
    <div className="container-wealthy">
      <h2 className="title-wealthy">Brokers</h2>

      <div className="input-group-wealthy">
        <input
          type="text"
          placeholder="Novo broker"
          value={newBroker}
          onChange={(e) => setNewBroker(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddBroker()}
        />
        <button className="add-button-wealthy" onClick={handleAddBroker}>
          Adicionar
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="error-wealthy"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {brokers.length > 0 ? (
          <motion.div layout className="card-grid-wealthy">
            {brokers.map((b) => (
              <motion.div
                key={b.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.3 }}
                className="card-wealthy"
              >
                <span>{b.name}</span>
                <button
                  aria-label={`Remover ${b.name}`}
                  className="remove-button-wealthy"
                  onClick={() => removeBroker(b.id)}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <p className="no-brokers-wealthy">Nenhum broker adicionado</p>
        )}
      </AnimatePresence>
    </div>
  )
}