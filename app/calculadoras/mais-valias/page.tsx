import type { Metadata } from "next"
import CapitalGainsCalculator from "../../../components/CapitalGainsCalculator"

export const metadata: Metadata = {
  title: "Calculadora de mais-valias de ações para o IRS (Anexo J) | Wealthy",
  description:
    "Calcula grátis as mais-valias das tuas ações na Trading 212, Degiro ou XTB pelo método FIFO, com câmbio do BCE, e obtém as linhas prontas para o Anexo J do IRS.",
}

export default function MaisValiasPage() {
  return <CapitalGainsCalculator />
}
