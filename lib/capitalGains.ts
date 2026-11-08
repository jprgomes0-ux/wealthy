// Cálculo de mais-valias de ações pelo método FIFO, para o Anexo J (quadro 9.2 A).
// Funções puras: sem React nem acesso à rede.

export type TxType = "compra" | "venda"

export type Transaction = {
  date: string // AAAA-MM-DD
  type: TxType
  ticker: string
  country: string // código numérico do país da empresa (ex.: 840 = EUA)
  qty: number | ""
  price: number | ""
  currency: string
  rate: number | "" // câmbio BCE do dia: 1 EUR = rate moeda
  rateDate?: string // preenchido quando o câmbio veio do BCE automaticamente (dia da taxa usada)
  fees: number | ""
  broker?: string // país da corretora (contraparte) quando vem de uma importação
}

export type AnexoJLine = {
  ticker: string
  country: string
  saleDate: string
  saleValue: number
  buyDate: string
  buyValue: number
  expenses: number
  qty: number
  broker?: string
  heldDays: number
  result: number
}

export type GainsResult = {
  lines: AnexoJLine[]
  warnings: { row: number; msg: string }[]
  gains: number
  losses: number
  balance: number
  tax28: number
  shortTerm: number
}

export const AUTONOMOUS_RATE = 0.28

type Lot = { date: string; qty: number; unitEUR: number; feePerUnit: number; country: string }

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)

export function computeGains(txs: Transaction[], year: number): GainsResult {
  const valid = txs
    .map((t, i) => ({ ...t, row: i, qty: Number(t.qty), price: Number(t.price) }))
    .filter(t => t.date && t.ticker.trim() && t.qty > 0 && t.price > 0)
    // Por data; no mesmo dia, compras antes de vendas
    .sort((a, b) => a.date.localeCompare(b.date) || (a.type === "compra" ? -1 : 1))

  const lots: Record<string, Lot[]> = {}
  const lines: AnexoJLine[] = []
  const warnings: GainsResult["warnings"] = []

  for (const t of valid) {
    const key = t.ticker.trim().toUpperCase()
    const rate = t.currency === "EUR" ? 1 : Number(t.rate)
    if (!(rate > 0)) {
      warnings.push({ row: t.row, msg: `Falta o câmbio BCE em ${key} (${t.date}).` })
      continue
    }
    const unitEUR = t.price / rate
    const feeEUR = (Number(t.fees) || 0) / rate
    const queue = (lots[key] ??= [])

    if (t.type === "compra") {
      queue.push({ date: t.date, qty: t.qty, unitEUR, feePerUnit: feeEUR / t.qty, country: t.country })
      continue
    }

    // Venda: consome primeiro os lotes mais antigos (FIFO)
    let remaining = t.qty
    const saleFeePerUnit = feeEUR / t.qty
    while (remaining > 1e-12 && queue.length) {
      const lot = queue[0]
      const q = Math.min(lot.qty, remaining)
      if (t.date.startsWith(String(year))) {
        const saleValue = q * unitEUR
        const buyValue = q * lot.unitEUR
        const expenses = q * lot.feePerUnit + q * saleFeePerUnit
        lines.push({
          ticker: key,
          country: lot.country || t.country,
          saleDate: t.date,
          saleValue,
          buyDate: lot.date,
          buyValue,
          expenses,
          qty: q,
          broker: t.broker,
          heldDays: daysBetween(lot.date, t.date),
          result: saleValue - buyValue - expenses,
        })
      }
      lot.qty -= q
      remaining -= q
      if (lot.qty <= 1e-12) queue.shift()
    }
    if (remaining > 1e-9) {
      warnings.push({
        row: t.row,
        msg: `Vendeste mais ${key} do que tinhas comprado (faltam ${+remaining.toFixed(6)} unidades). Adiciona as compras anteriores.`,
      })
    }
  }

  const gains = lines.filter(l => l.result > 0).reduce((s, l) => s + l.result, 0)
  const losses = lines.filter(l => l.result < 0).reduce((s, l) => s + l.result, 0)
  const balance = gains + losses
  return {
    lines,
    warnings,
    gains,
    losses,
    balance,
    tax28: Math.max(balance, 0) * AUTONOMOUS_RATE,
    shortTerm: lines.filter(l => l.heldDays < 365).length,
  }
}
