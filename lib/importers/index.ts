import { parseCSV, parseTrading212, type ImportResult } from "./trading212"
import { isDegiro, parseDegiro } from "./degiro"
import { isDegiroAccount, parseDegiroAccount } from "./degiroAccount"

export type Broker = "trading212" | "degiro"
export const BROKER_NAMES: Record<Broker, string> = { trading212: "Trading 212", degiro: "Degiro" }

// Deteta a corretora pelo cabeçalho do CSV e usa o leitor certo
export function importCSV(text: string): ImportResult & { broker?: Broker } {
  const header = parseCSV(text.split(/\r?\n/, 1)[0] ?? "")[0] ?? []
  const h = header.map(x => x.toLowerCase().trim())
  if (h.includes("action") && h.includes("no. of shares")) return { ...parseTrading212(text), broker: "trading212" }
  if (isDegiro(header)) return { ...parseDegiro(text), broker: "degiro" }
  if (isDegiroAccount(header)) return { ...parseDegiroAccount(text), broker: "degiro" }
  // Ficheiro "Portfólio" da Degiro: só tem as posições atuais, sem datas nem preços de compra
  if (h.some(x => /^(produto|product)$/.test(x)) && h.some(x => /(valor em eur|value in eur)/.test(x))) {
    return {
      txs: [],
      dividends: [],
      skipped: 0,
      errors: [
        "Este é o ficheiro Portfólio da Degiro, que só mostra o que tens hoje. Para as mais-valias preciso do ficheiro de Transações: Caixa de entrada → Transações → escolhe as datas → Exportar → CSV.",
      ],
    }
  }
  return {
    txs: [],
    dividends: [],
    skipped: 0,
    errors: ["Não reconheci o ficheiro. Por agora aceito o histórico da Trading 212 e, da Degiro, as Transações e o Extrato de conta, em CSV."],
  }
}
