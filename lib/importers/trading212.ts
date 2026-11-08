// Lê o CSV de histórico exportado pela Trading 212 (Histórico → Exportar).
// As colunas variam um pouco entre versões, por isso procuramos cada uma pelo nome.
import type { Transaction } from "../capitalGains"
import type { Dividend } from "../dividends"

export type ImportResult = {
  txs: Transaction[]
  dividends: Dividend[]
  skipped: number // linhas que não são compras nem vendas (depósitos, dividendos, juros…)
  errors: string[]
}

// Trading 212 Markets Ltd (Chipre) serve os clientes da UE
export const TRADING212_COUNTRY = "196"

// Código de país do ISIN (2 letras) -> código numérico usado no Anexo J
const ISIN_COUNTRY: Record<string, string> = {
  US: "840", NL: "528", DE: "276", FR: "250", IE: "372", GB: "826", ES: "724", IT: "380",
  CH: "756", LU: "442", CY: "196", CA: "124", JP: "392", DK: "208", SE: "752", PT: "620",
  BE: "056", FI: "246", NO: "578", AT: "040", AU: "036", CN: "156", TW: "158", HK: "344",
  KY: "136", JE: "832", BM: "060", IL: "376", BR: "076", KR: "410", IN: "356", SG: "702",
}

export function isinToCountry(isin: string): string {
  return ISIN_COUNTRY[isin.slice(0, 2).toUpperCase()] ?? ""
}

// Parser de CSV com suporte a campos entre aspas (os nomes das empresas podem ter vírgulas)
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  const src = text.replace(/^﻿/, "")
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ",") { row.push(field); field = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++
      row.push(field); field = ""
      if (row.some(v => v !== "")) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some(v => v !== "")) rows.push(row)
  return rows
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

export function parseTrading212(text: string): ImportResult {
  const rows = parseCSV(text)
  if (rows.length < 2) return { txs: [], dividends: [], skipped: 0, errors: ["O ficheiro está vazio."] }

  const header = rows[0].map(norm)
  const col = (...names: string[]) => header.findIndex(h => names.map(norm).includes(h))
  // Colunas de custos (vêm na moeda da conta): conversão cambial, stamp duty, taxas francesas, etc.
  // (ignoramos as colunas "Currency (…)" que só dizem a moeda de cada custo)
  const isFee = (h: string) => /(conversionfee|stampduty\w*|transactiontax|transactionfee|finrafee|ptmlevy)$/.test(h)
  const feeCols = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => isFee(h) && !(h.startsWith("currency") && isFee(h.slice("currency".length)) && h !== "currencyconversionfee"))

  const c = {
    action: col("Action"),
    time: col("Time"),
    isin: col("ISIN"),
    ticker: col("Ticker"),
    qty: col("No. of shares"),
    price: col("Price / share"),
    priceCur: col("Currency (Price / share)"),
    fx: col("Exchange rate"),
    wht: col("Withholding tax"),
    whtCur: col("Currency (Withholding tax)"),
  }
  if (c.action < 0 || c.qty < 0 || c.price < 0 || c.time < 0) {
    return {
      txs: [],
      dividends: [],
      skipped: 0,
      errors: ["Isto não parece um extrato da Trading 212. Exporta em Histórico → Exportar histórico, em CSV."],
    }
  }

  const txs: Transaction[] = []
  const dividends: Dividend[] = []
  const errors: string[] = []
  let skipped = 0

  rows.slice(1).forEach((r, k) => {
    const action = (r[c.action] ?? "").toLowerCase().trim()
    const isBuy = action.endsWith(" buy")
    const isSell = action.endsWith(" sell")

    // Dividendos: "Dividend (Ordinary)", "Dividend (Dividend)", etc. (fica de fora o "dividend adjustment")
    if (action.startsWith("dividend") && !action.includes("adjustment")) {
      const shares = Number(r[c.qty])
      const perShare = Number(r[c.price])
      const date = (r[c.time] ?? "").slice(0, 10)
      if (!(shares > 0) || !(perShare > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        errors.push(`Linha ${k + 2} ignorada: dividendo com dados incompletos.`)
        return
      }
      let currency = ((c.priceCur >= 0 ? r[c.priceCur] : "") || "EUR").toUpperCase()
      let gross = shares * perShare
      if (currency === "GBX") { currency = "GBP"; gross /= 100 }
      const fx = c.fx >= 0 ? Number(r[c.fx]) || 1 : 1
      let withheld = c.wht >= 0 ? Math.abs(Number(r[c.wht]) || 0) : 0
      const whtCur = (c.whtCur >= 0 ? r[c.whtCur] : "").toUpperCase()
      // Se a retenção vier em EUR e o dividendo noutra moeda, passamos para a moeda do dividendo
      if (withheld && whtCur === "EUR" && currency !== "EUR") withheld *= currency === "GBP" && fx > 10 ? fx / 100 : fx
      const isin = c.isin >= 0 ? r[c.isin] ?? "" : ""
      dividends.push({
        date,
        ticker: ((c.ticker >= 0 ? r[c.ticker] : "") || isin).toUpperCase(),
        country: isinToCountry(isin) || "840",
        currency,
        gross: +gross.toFixed(4),
        withheld: +withheld.toFixed(4),
        rate: currency === "EUR" ? 1 : "",
        broker: TRADING212_COUNTRY,
      })
      return
    }

    if (!isBuy && !isSell) { skipped++; return }

    const qty = Number(r[c.qty])
    const rawPrice = Number(r[c.price])
    const rawCurrency = ((c.priceCur >= 0 ? r[c.priceCur] : "") || "EUR").toUpperCase()
    // A coluna "Exchange rate" é a moeda do preço por 1 EUR (ex.: 1.08 USD)
    const fx = c.fx >= 0 ? Number(r[c.fx]) || 1 : 1
    const feesEUR = feeCols.reduce((s, { i }) => s + (Math.abs(Number(r[i])) || 0), 0)
    const date = (r[c.time] ?? "").slice(0, 10)

    if (!(qty > 0) || !(rawPrice > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Linha ${k + 2} ignorada: dados incompletos.`)
      return
    }

    // Ações de Londres vêm em GBX (pence): passamos para libras
    const isPence = rawCurrency === "GBX"
    const currency = isPence ? "GBP" : rawCurrency
    const price = isPence ? rawPrice / 100 : rawPrice
    // Em GBX a taxa pode vir em pence por EUR (~85) ou em libras por EUR (~0.85)
    const fxCurrency = isPence && fx > 10 ? fx / 100 : fx
    const isin = c.isin >= 0 ? r[c.isin] ?? "" : ""

    txs.push({
      date,
      type: isBuy ? "compra" : "venda",
      ticker: ((c.ticker >= 0 ? r[c.ticker] : "") || isin).toUpperCase(),
      country: isinToCountry(isin) || "840",
      qty,
      price,
      currency,
      rate: currency === "EUR" ? 1 : "",
      // A calculadora espera as comissões na moeda do preço
      fees: +(currency === "EUR" ? feesEUR : feesEUR * fxCurrency).toFixed(4),
      broker: TRADING212_COUNTRY,
    })
  })

  txs.sort((a, b) => a.date.localeCompare(b.date))
  dividends.sort((a, b) => a.date.localeCompare(b.date))
  return { txs, dividends, skipped, errors }
}
