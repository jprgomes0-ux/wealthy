"use client"

import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import "../style/ProfileSetup.css"

type FieldErrors = {
  name?: string
  lastName?: string
  dob?: string
  phone?: string
  annualIncome?: string
}

export default function ProfileSetup() {
  const { user, createProfile } = useAuth()
  const [dob, setDob] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [investorProfile, setInvestorProfile] = useState("moderado")
  const [annualIncome, setAnnualIncome] = useState("")
  const [name, setName] = useState("")
  const [lastName, setLastName] = useState("")

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [success, setSuccess] = useState("")

  const getAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()

    const m = today.getMonth() - birth.getMonth()

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    return age
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const errors: FieldErrors = {}

    if (!name) {
  errors.name = "Nome obrigatório"
}

if (!lastName) {
  errors.lastName = "Apelido obrigatório"
}

    if (!dob) {
      errors.dob = "Data de nascimento obrigatória"
    } else if (getAge(dob) < 18) {
      errors.dob = "Você deve ter pelo menos 18 anos"
    }

    if (phone && !/^\d{8,}$/.test(phone.replace(/\D/g, ""))) {
      errors.phone = "Telefone inválido"
    }

    if (annualIncome && parseFloat(annualIncome) < 0) {
      errors.annualIncome = "Renda deve ser positiva"
    }

    if (!name) {
  errors.name = "Nome obrigatório"
}

if (!lastName) {
  errors.lastName = "Apelido obrigatório"
}

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) return

    if (!user) return

    try {
      await createProfile(user.id, {
  name: name,
  last_name: lastName,
  dob,
  phone,
  address,
  investor_profile: investorProfile,
  annual_income: annualIncome ? parseFloat(annualIncome) : null,
})
      setSuccess("Perfil criado com sucesso!")
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFieldErrors({ name: err.message })
      }
    }
  }

  const renderInput = (
    label: string,
    value: string,
    setValue: (val: string) => void,
    errorKey?: keyof FieldErrors,
    type: string = "text",
    required: boolean = false
  ) => (
    <>
      <label className="profile-label-wealthy">
        {label} {required && <span className="profile-required">*</span>}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`profile-input-wealthy ${
          errorKey && fieldErrors[errorKey] ? "profile-input-error" : ""
        }`}
      />

      {errorKey && fieldErrors[errorKey] && (
        <p className="profile-error">{fieldErrors[errorKey]}</p>
      )}
    </>
  )

  return (
    <form onSubmit={handleSubmit} className="profile-container-wealthy">
      <h2 className="profile-title-wealthy">
        Complete o seu perfil
      </h2>

      {renderInput(
  "Primeiro nome",
  name,
  setName,
  "name",
  "text",
  true
)}

{renderInput(
  "Apelido",
  lastName,
  setLastName,
  "lastName",
  "text",
  true
)}

      {renderInput(
        "Data de nascimento",
        dob,
        setDob,
        "dob",
        "date",
        true
      )}

      {renderInput(
        "Telefone",
        phone,
        setPhone,
        "phone",
        "tel"
      )}

      {renderInput(
        "Endereço",
        address,
        setAddress
      )}

      

      <label className="profile-label-wealthy">
        Perfil de investidor
      </label>

      <select
        value={investorProfile}
        onChange={(e) => setInvestorProfile(e.target.value)}
        className="profile-select-wealthy"
      >
        <option value="conservador">Conservador</option>
        <option value="moderado">Moderado</option>
        <option value="agressivo">Agressivo</option>
      </select>

      {renderInput(
        "Renda anual (opcional)",
        annualIncome,
        setAnnualIncome,
        "annualIncome",
        "number"
      )}

      <button
        type="submit"
        className="profile-button-wealthy"
      >
        Salvar perfil
      </button>

      {success && (
        <p className="profile-success">
          {success}
        </p>
      )}
    </form>
  )
}