"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { computeDividends, DIVIDEND_RATE, TREATY_RATE, type Dividend } from "../lib/dividends"
import { BROKER_NAMES, importCSV } from "../lib/importers"
import { COUNTRIES, CURRENCIES, countryName } from "../lib/countries"
import { useEcbRates } from "../lib/useEcbRates"
import "../style/Calculator.css"

const EXAMPLE: Dividend[] = [
  { date: "2025-04-01", ticker: "KO", country: "840", currency: "USD", gross: 4.59, withheld: 0.69, rate: "" },
  { date: "2025-05-30", ticker: "THALES", country: "250", currency: "EUR", gross: 8.55, withheld: 2.14, rate: 1 },
  { date: "2025-08-14", ticker: "AAPL", country: "840", currency: "USD", gross: 3.9, withheld: 0.59, rate: "" },
]
const STORE = "wealthy-dividendos-v1"
const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })
const plain = new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = (v: number) => `${Math.round(v * 100)}%`
const cloneExample = () => EXAMPLE.map(d => ({ ...d }))
const num = (v: string): number | "" => (v === "" ? "" : Number(v))
const sig = (d: Dividend) => [d.date, d.ticker, d.currency, d.gross].join("|")

export default function DividendsCalculator() {
  const [divs, setDivs] = useState<Dividend[]>(cloneExample)
  const [year, setYear] = useState(2025)
  const [loaded, setLoaded] = useState(false)
  const [copied, setCopied] = useState("")
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null")
      if (saved?.divs) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDivs(saved.divs)
        setYear(saved.year ?? 2025)
      }
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORE, JSON.stringify({ divs, year }))
    } catch {}
  }, [divs, year, loaded])

  const { status: fxStatus, reset: resetFx, clearRow: clearFx } = useEcbRates(divs, setDivs)
  const result = useMemo(() => computeDividends(divs, year), [divs, year])

  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: 9 }, (_, k) => thisYear - k)

  const update = (i: number, patch: Partial<Dividend>) => {
    if ("rate" in patch) clearFx(i)
    setDivs(prev =>
      prev.map((d, j) => {
        if (j !== i) return d
        const next = { ...d, ...patch }
        if ("date" in patch || "currency" in patch) {
          next.rate = next.currency === "EUR" ? 1 : ""
          next.rateDate = undefined
        }
        return next
      })
    )
  }

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const imported: Dividend[] = []
    const brokers = new Set<string>()
    const errors: string[] = []
    let hadTrades = false
    for (const file of Array.from(files)) {
      const r = importCSV(await file.text())
      if (r.broker && r.dividends.length) brokers.add(BROKER_NAMES[r.broker])
      if (r.txs.length) hadTrades = true
      imported.push(...r.dividends)
      errors.push(...r.errors.map(e => `${file.name}: ${e}`))
    }
    if (!imported.length) {
      setImportMsg({
        ok: false,
        text: hadTrades
          ? "Este ficheiro não tem dividendos. Na Degiro, os dividendos estão no Extrato de conta, e não nas Transações."
          : errors[0] ?? "Não encontrei dividendos no ficheiro.",
      })
      return
    }
    const isExample = divs.length === EXAMPLE.length && divs.every((d, k) => sig(d) === sig(EXAMPLE[k]))
    const base = isExample ? [] : divs
    const seen = new Set(base.map(sig))
    const fresh = imported.filter(d => (seen.has(sig(d)) ? false : (seen.add(sig(d)), true)))
    resetFx()
    setDivs([...base, ...fresh].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999")))
    const last = fresh.map(d => d.date).sort().pop()
    if (last) setYear(Number(last.slice(0, 4)))
    const dup = imported.length - fresh.length
    setImportMsg({
      ok: true,
      text: `Importei ${fresh.length} ${fresh.length === 1 ? "dividendo" : "dividendos"} da ${Array.from(brokers).join(" e da ")}${dup ? ` (${dup} já existiam)` : ""}.`,
    })
  }

  const copyTable = async () => {
    const head = ["Código", "País da fonte", "Rendimento bruto", "Imposto pago no estrangeiro (país da fonte)"]
    const rows = result.byCountry.map(l => ["E11", l.country, plain.format(l.gross), plain.format(l.withheld)])
    try {
      await navigator.clipboard.writeText([head, ...rows].map(r => r.join("\t")).join("\n"))
      setCopied("Tabela copiada")
    } catch {
      setCopied("O browser não deixou copiar. Seleciona a tabela à mão.")
    }
    setTimeout(() => setCopied(""), 3000)
  }

  return (
    <main className="calc">
      <nav className="calc-nav">
        <Link href="/">← Wealthy</Link>
        <Link href="/calculadoras/mais-valias">Mais-valias</Link>
        <span className="calc-nav-current">Dividendos</span>
      </nav>

      <header className="calc-header">
        <div>
          <h1>Calculadora de imposto sobre dividendos estrangeiros</h1>
          <p className="calc-lede">
            Os dividendos de empresas estrangeiras pagam imposto duas vezes: uma retenção no país da empresa e 28% em
            Portugal. O imposto retido lá fora é abatido em Portugal até ao limite da convenção entre os dois países.
            Esta calculadora diz-te quanto ainda pagas e dá-te as linhas do Anexo J, quadro 8 A.
          </p>
        </div>
        <label className="calc-field" htmlFor="div-year">
          Ano do IRS (dividendos recebidos em)
          <select id="div-year" value={year} onChange={e => setYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </header>

      <div className="calc-tiles">
        <div className="calc-tile"><span>Dividendos brutos</span><strong>{eur.format(result.gross)}</strong></div>
        <div className="calc-tile"><span>Retido lá fora</span><strong>{eur.format(result.withheld)}</strong></div>
        <div className="calc-tile"><span>Crédito de imposto</span><strong className="calc-pos">{eur.format(result.credit)}</strong></div>
        <div className="calc-tile calc-tile-main"><span>A pagar em Portugal</span><strong>{eur.format(result.ptTax)}</strong></div>
      </div>

      <div className="calc-verdict">
        {result.lostWithholding > 0.005 ? (
          <>
            <span className="calc-pill">Retenção a mais</span>
            <span>
              Perdes {eur.format(result.lostWithholding)} retidos lá fora que Portugal não deixa abater, porque passam o
              limite da convenção. Na Alemanha (26,4%) é normal. Nos EUA, se te retiveram 30%, preenche o formulário
              W-8BEN na tua corretora para passar a 15%.
            </span>
          </>
        ) : (
          <>
            <span className="calc-pill">Tudo aproveitado</span>
            <span>Todo o imposto retido lá fora é abatido em Portugal.</span>
          </>
        )}
      </div>

      <section className="calc-card">
        <div className="calc-card-head">
          <h2>Dividendos recebidos</h2>
          <div className="calc-actions">
            <button type="button" className="calc-btn" onClick={() => setDivs(prev => [...prev, { date: "", ticker: "", country: prev[prev.length - 1]?.country ?? "840", currency: prev[prev.length - 1]?.currency ?? "USD", gross: "", withheld: "", rate: "" }])}>Adicionar dividendo</button>
            <button type="button" className="calc-btn calc-ghost" onClick={() => { resetFx(); setDivs(cloneExample()); setYear(2025) }}>Repor exemplo</button>
            <button type="button" className="calc-btn calc-ghost" onClick={() => { resetFx(); setDivs([]) }}>Limpar tudo</button>
          </div>
        </div>

        <label
          htmlFor="div-file"
          className={`calc-drop${dragging ? " calc-drop-active" : ""}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); importFiles(e.dataTransfer.files) }}
        >
          <strong>Importar da Trading 212 ou da Degiro</strong>
          <span>Arrasta para aqui os CSV ou clica para os escolher.</span>
          <span>
            Trading 212: o mesmo histórico da calculadora de mais-valias (Histórico → exportar → CSV).
            <br />
            Degiro: Caixa de entrada → <b>Extrato de conta</b> → escolhe o ano → Exportar → CSV.
          </span>
          <input id="div-file" type="file" accept=".csv,text/csv" multiple onChange={e => { importFiles(e.target.files); e.target.value = "" }} />
        </label>
        {importMsg && <p className={importMsg.ok ? "calc-import-ok" : "calc-import-err"} role="status">{importMsg.text}</p>}

        {result.warnings.length > 0 && (
          <div className="calc-warn">
            {result.warnings.map((w, k) => <span key={k}>Linha {w.row + 1}: {w.msg}</span>)}
          </div>
        )}

        <div className="calc-table-wrap">
          <table className="calc-table calc-div">
            <thead>
              <tr>
                <th>Data</th><th>Ativo</th><th>País da empresa</th><th>Moeda</th>
                <th className="r">Bruto</th><th className="r">Retido lá fora</th><th className="r">Câmbio BCE</th><th aria-label="Apagar"></th>
              </tr>
            </thead>
            <tbody>
              {divs.map((d, i) => (
                <tr key={i}>
                  <td><input id={`ddate-${i}`} aria-label="Data" type="date" value={d.date} onChange={e => update(i, { date: e.target.value })} /></td>
                  <td><input id={`dticker-${i}`} aria-label="Ativo" value={d.ticker} placeholder="KO" onChange={e => update(i, { ticker: e.target.value })} /></td>
                  <td>
                    <select id={`dcountry-${i}`} aria-label="País da empresa" value={d.country} onChange={e => update(i, { country: e.target.value })}>
                      {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n} ({c})</option>)}
                    </select>
                  </td>
                  <td>
                    <select id={`dcur-${i}`} aria-label="Moeda" value={d.currency} onChange={e => update(i, { currency: e.target.value })}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td><input id={`dgross-${i}`} aria-label="Dividendo bruto" className="num" type="number" step="any" min="0" value={d.gross} onChange={e => update(i, { gross: num(e.target.value) })} /></td>
                  <td><input id={`dwht-${i}`} aria-label="Imposto retido lá fora" className="num" type="number" step="any" min="0" value={d.withheld} onChange={e => update(i, { withheld: num(e.target.value) })} /></td>
                  <td>
                    <input id={`drate-${i}`} aria-label="Câmbio BCE" className="num" type="number" step="any" min="0" readOnly={d.currency === "EUR" || !!d.rateDate} disabled={d.currency === "EUR"} value={d.currency === "EUR" ? 1 : d.rate} onChange={e => update(i, { rate: num(e.target.value) })} />
                    {d.currency !== "EUR" && d.rateDate && <small className="calc-fx">BCE{d.rateDate !== d.date ? ` de ${d.rateDate}` : ""}</small>}
                    {d.currency !== "EUR" && !d.rateDate && fxStatus[i] && <small className="calc-fx">{fxStatus[i]}</small>}
                  </td>
                  <td><button type="button" className="calc-icon" aria-label="Apagar dividendo" onClick={() => { resetFx(); setDivs(prev => prev.filter((_, j) => j !== i)) }}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="calc-card">
        <div className="calc-card-head">
          <h2>Anexo J, quadro 8 A</h2>
          <div className="calc-actions">
            <span className="calc-copied" aria-live="polite">{copied}</span>
            <button type="button" className="calc-btn" onClick={copyTable} disabled={!result.byCountry.length}>Copiar tabela</button>
          </div>
        </div>
        <p className="calc-note">
          Uma linha por país, já em euros. Código E11 = dividendos. O rendimento bruto e o imposto pago no estrangeiro
          vão para as colunas com o mesmo nome no Portal das Finanças. As Finanças calculam o crédito sozinhas.
        </p>
        <div className="calc-table-wrap">
          <table className="calc-table">
            <thead>
              <tr>
                <th>Código</th><th>País da fonte</th><th className="r">Rendimento bruto</th><th className="r">Imposto pago no estrangeiro</th>
                <th className="r">Limite da convenção</th><th className="r">Crédito</th><th className="r">A pagar em PT</th>
              </tr>
            </thead>
            <tbody>
              {result.byCountry.length ? (
                result.byCountry.map(l => (
                  <tr key={l.country}>
                    <td>E11</td>
                    <td>{countryName(l.country)} ({l.country})</td>
                    <td className="r num">{plain.format(l.gross)}</td>
                    <td className="r num">{plain.format(l.withheld)}</td>
                    <td className="r num">{TREATY_RATE[l.country] != null ? pct(TREATY_RATE[l.country]) : "sem convenção"}</td>
                    <td className="r num">{plain.format(l.credit)}</td>
                    <td className="r num">{plain.format(l.ptTax)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="calc-note">Sem dividendos em {year}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="calc-footer">
        <p>
          Cálculo com a taxa autónoma de {pct(DIVIDEND_RATE)}. Também podes optar pelo englobamento, e nesse caso os
          dividendos de empresas da UE só contam em 50%. Os limites das convenções são os habituais para investidores
          particulares. Confirma o do teu caso no Portal das Finanças.
        </p>
        <p>
          Os dados ficam só neste browser. É uma ajuda ao cálculo e não substitui um contabilista. Confirma sempre os
          valores antes de submeter a declaração.
        </p>
      </footer>
    </main>
  )
}
