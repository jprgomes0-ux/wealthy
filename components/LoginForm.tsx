"use client"
import { useState } from "react"
import Link from "next/link"
import { useAuth } from "../context/AuthContext"
import "../style/Login.css"

export default function LoginForm() {
  const { signIn, signUp } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setError("")
    setSuccess("")

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError("Senhas não coincidem")
          return
        }

        await signUp(email, password)

        setSuccess("Conta criada! Verifique seu email para confirmar.")
        setIsSignUp(false)
        setEmail("")
        setPassword("")
        setConfirmPassword("")
      } else {
        await signIn(email, password)
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError("Erro inesperado")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-container-wealthy">
      <h2 className="login-title-wealthy">
        {isSignUp ? "Registrar" : "Entrar"}
      </h2>

      <label>Email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="login-input-wealthy"
        required
      />

      <label>Senha</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="login-input-wealthy"
        required
      />

      {isSignUp && (
        <>
          <label>Confirmar senha</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="login-input-wealthy"
            required
          />
        </>
      )}

      <button type="submit" className="login-button-wealthy">
        {isSignUp ? "Registrar" : "Entrar"}
      </button>

      <p
        className="login-toggle-wealthy"
        onClick={() => setIsSignUp(!isSignUp)}
      >
        {isSignUp ? "Já tem conta? Entrar" : "Criar conta"}
      </p>

      {success && <p className="login-success-wealthy">{success}</p>}
      {error && <p className="login-field-error">{error}</p>}

      <p style={{ marginTop: 16, fontSize: 14, textAlign: "center" }}>
        <Link href="/calculadoras/mais-valias">Calculadora grátis de mais-valias para o IRS →</Link>
      </p>
    </form>
  )
}