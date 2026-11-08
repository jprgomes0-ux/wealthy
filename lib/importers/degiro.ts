// Lê o CSV de transações da Degiro (Caixa de entrada → Transações → Exportar → CSV).
// O cabeçalho vem na língua da conta (PT, EN, ES, NL, DE, FR…) e há colunas sem nome
// para as moedas, por isso localizamos as colunas pela posição relativa ao cabeçalho.
import type { Transaction } from "../capitalGains"
import { isinToCountry, parseCSV, type ImportResult } from "./trading212"

export const DEGIRO_COUNTRY = "528" // flatexDEGIRO Bank, Países Baixos (sucursal NL)

export const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "")

// "1.234,56" / "1,234.56" / "1234,56" / "-3.5" -> número
export function parseNumber(raw: string | undefined): number {
  if (!raw) return NaN
  let s = raw.trim().replace(/\s/g, "")
  const lastComma = s.lastIndexOf(",")
  const lastDot = s.lastIndexOf(".")
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".")
  else s = s.replace(/,/g, "")
  return Number(s)
}

// "15-04-2025" ou "15/04/2025" -> "2025-04-15"
export function parseDate(raw: string): string {
  const m = raw.trim().match(/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ""
}

const HEADERS = {
  date: ["data", "date", "fecha", "datum"],
  product: ["produto", "product", "producto", "produkt", "produit"],
  isin: ["isin"],
  qty: ["quantidade", "quantity", "number", "cantidad", "aantal", "anzahl", "quantite"],
  price: ["precos", "preco", "price", "precio", "koers", "kurs", "prix", "cours"],
  fx: ["taxadecambio", "taxacambio", "exchangerate", "tipodecambio", "wisselkoers", "wechselkurs", "tauxdechange"],
  fee: [
    "custosdetransacaoeoudeterceiros", "custosdetransacao", "transactionandorthirdpartyfees", "transactioncosts",
    "transactionfees", "costesdetransaccionyodeterceros", "transactiekostenenofkostenvanderden",
    "transaktionskostenundodergebuhrendritter", "fraisdetransactionetoutiers",
  ],
  autofx: ["autofxfee", "custoautofx", "comisionautofx", "autofxkosten", "autofxgebuhr", "fraisautofx"],
}

export function isDegiro(header: string[]): boolean {
  const h = header.map(norm)
  return h.includes("isin") && h.some(x => HEADERS.product.includes(x)) && h.some(x => HEADERS.qty.includes(x)) && h.some(x => HEADERS.fx.includes(x))
}

export function parseDegiro(text: string): ImportResult {
  const rows = parseCSV(text)
  if (rows.length < 2) return { txs: [], dividends: [], skipped: 0, errors: ["O ficheiro está vazio."] }
  const header = rows[0].map(norm)
  const find = (names: string[]) => header.findIndex(h => names.includes(h))

  const c = {
    date: find(HEADERS.date),
    product: find(HEADERS.product),
    isin: find(HEADERS.isin),
    qty: find(HEADERS.qty),
    price: find(HEADERS.price),
    fx: find(HEADERS.fx),
    fee: find(HEADERS.fee),
    autofx: find(HEADERS.autofx),
  }
  if (c.date < 0 || c.isin < 0 || c.qty < 0 || c.price < 0) {
    return { txs: [], dividends: [], skipped: 0, errors: ["Isto não parece o ficheiro de Transações da Degiro."] }
  }
  // A moeda de cada valor está na coluna sem nome logo a seguir
  const priceCur = c.price + 1
  const feeCur = c.fee >= 0 ? c.fee + 1 : -1
  const autofxCur = c.autofx >= 0 ? c.autofx + 1 : -1

  const txs: Transaction[] = []
  const errors: string[] = []
  let skipped = 0

  rows.slice(1).forEach((r, k) => {
    const date = parseDate(r[c.date] ?? "")
    const qtySigned = parseNumber(r[c.qty])
    const price = parseNumber(r[c.price])
    const currency = (r[priceCur] ?? "").trim().toUpperCase() || "EUR"
    if (!date || !qtySigned || !(price > 0)) {
      if ((r[c.isin] ?? "").trim()) errors.push(`Linha ${k + 2} ignorada: dados incompletos.`)
      else skipped++
      return
    }
    // Taxa de câmbio da Degiro: moeda do preço por 1 EUR (vazia quando a ação é em EUR)
    const fx = parseNumber(r[c.fx]) || 1

    // Custos na moeda da conta (normalmente EUR): passamos para a moeda do preço
    const toPriceCurrency = (amount: number, cur: string) =>
      !amount ? 0 : cur === currency ? amount : cur === "EUR" ? amount * fx : amount
    const fee = c.fee >= 0 ? Math.abs(parseNumber(r[c.fee]) || 0) : 0
    const autofx = c.autofx >= 0 ? Math.abs(parseNumber(r[c.autofx]) || 0) : 0
    const fees =
      toPriceCurrency(fee, (r[feeCur] ?? "EUR").trim().toUpperCase() || "EUR") +
      toPriceCurrency(autofx, (autofxCur >= 0 ? r[autofxCur] : "EUR")?.trim().toUpperCase() || "EUR")

    const isPence = currency === "GBX"
    const isin = (r[c.isin] ?? "").trim()
    txs.push({
      date,
      type: qtySigned > 0 ? "compra" : "venda",
      ticker: ((c.product >= 0 ? r[c.product] : "") || isin).trim().toUpperCase().slice(0, 40),
      country: isinToCountry(isin) || "840",
      qty: Math.abs(qtySigned),
      price: isPence ? price / 100 : price,
      currency: isPence ? "GBP" : currency,
      rate: currency === "EUR" ? 1 : "",
      fees: +(isPence ? fees / 100 : fees).toFixed(4),
      broker: DEGIRO_COUNTRY,
    })
  })

  txs.sort((a, b) => a.date.localeCompare(b.date))
  return { txs, dividends: [], skipped, errors }
}
