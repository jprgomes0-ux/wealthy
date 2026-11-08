// Lê o Extrato de conta da Degiro (Caixa de entrada → Extrato de conta → Exportar → CSV)
// para tirar os dividendos e o imposto retido na fonte.
import type { Dividend } from "../dividends"
import { isinToCountry, parseCSV, type ImportResult } from "./trading212"
import { DEGIRO_COUNTRY, norm, parseDate, parseNumber } from "./degiro"

const H = {
  date: ["data", "date", "fecha", "datum"],
  valueDate: ["datavalor", "valuedate", "fechavalor", "valutadatum", "valuta"],
  product: ["produto", "product", "producto", "produkt", "produit"],
  isin: ["isin"],
  desc: ["descricao", "description", "descripcion", "omschrijving", "beschreibung"],
  change: ["variacao", "mudanca", "change", "variacion", "mutatie", "anderung", "mouvement"],
}

export function isDegiroAccount(header: string[]): boolean {
  const h = header.map(norm)
  return h.includes("isin") && h.some(x => H.desc.includes(x)) && h.some(x => H.change.includes(x))
}

const isCurrency = (s: string | undefined) => /^[A-Z]{3}$/.test((s ?? "").trim())

export function parseDegiroAccount(text: string): ImportResult {
  const rows = parseCSV(text)
  const empty = { txs: [], dividends: [], skipped: 0 }
  if (rows.length < 2) return { ...empty, errors: ["O ficheiro está vazio."] }
  const header = rows[0].map(norm)
  const find = (names: string[]) => header.findIndex(x => names.includes(x))
  const c = {
    date: find(H.date),
    valueDate: find(H.valueDate),
    product: find(H.product),
    isin: find(H.isin),
    desc: find(H.desc),
    change: find(H.change),
  }
  if (c.date < 0 || c.isin < 0 || c.desc < 0 || c.change < 0) {
    return { ...empty, errors: ["Isto não parece o Extrato de conta da Degiro."] }
  }

  // Dividendo e imposto retido vêm em linhas separadas: juntamos por produto + data + moeda
  const groups: Record<string, Dividend> = {}
  let skipped = 0
  rows.slice(1).forEach(r => {
    const desc = (r[c.desc] ?? "").toLowerCase()
    const isin = (r[c.isin] ?? "").trim()
    if (!isin || !/dividend/.test(desc)) { skipped++; return }
    const isTax = /(imposto|tax|impuesto|belasting|steuer|impot|retenc|reten)/.test(desc)

    // A "Variação" ocupa duas colunas: moeda e valor (a ordem varia entre versões)
    const a = r[c.change], b = r[c.change + 1]
    const currency = (isCurrency(a) ? a : b ?? "EUR").trim()
    const amount = parseNumber(isCurrency(a) ? b : a)
    if (!amount) { skipped++; return }

    const date = parseDate(r[c.valueDate >= 0 ? c.valueDate : c.date] ?? "") || parseDate(r[c.date] ?? "")
    if (!date) { skipped++; return }
    const key = `${isin}|${date}|${currency}`
    const g = (groups[key] ??= {
      date,
      ticker: ((c.product >= 0 ? r[c.product] : "") || isin).trim().toUpperCase().slice(0, 40),
      country: isinToCountry(isin) || "840",
      currency,
      gross: 0,
      withheld: 0,
      rate: currency === "EUR" ? 1 : "",
      broker: DEGIRO_COUNTRY,
    })
    if (isTax) g.withheld = +((Number(g.withheld) || 0) + Math.abs(amount)).toFixed(4)
    else g.gross = +((Number(g.gross) || 0) + amount).toFixed(4)
  })

  const dividends = Object.values(groups)
    .filter(d => Number(d.gross) > 0)
    .sort((x, y) => x.date.localeCompare(y.date))
  return { txs: [], dividends, skipped, errors: [] }
}
