"use client"

import { useAuth } from "../context/AuthContext"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import Image from "next/image"
import toast from "react-hot-toast"
import "../style/UserProfile.css"

type UserProfileData = {
  name: string
  last_name?: string
  phone: string
  avatar_url?: string
}

export default function UserProfile() {
  const { user, signOut, setUser } = useAuth()
  const [profile, setProfile] = useState<UserProfileData>({
    name: "",
    phone: "",
    avatar_url: "",
  })
  const [email, setEmail] = useState(user?.email || "")
  const [loading, setLoading] = useState(false)
  const [updatingEmail, setUpdatingEmail] = useState(false)
  const [emailPending, setEmailPending] = useState(false)
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null)

  // --- Buscar perfil ---
  useEffect(() => {
    if (!user) return

    const fetchProfile = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("name,last_name,phone,avatar_url")
          .eq("id", user.id)
          .single()
        if (error && error.code !== "PGRST116") throw error
        if (data) setProfile(data as UserProfileData)
      } catch (err: unknown) {
        if (err instanceof Error) toast.error("Erro ao buscar perfil: " + err.message)
        else toast.error("Erro ao buscar perfil")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  // --- Upload avatar ---
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files || !user) return
  const file = e.target.files[0]

  // Preview do avatar
  const reader = new FileReader()
  reader.onloadend = () => setPreviewAvatar(reader.result as string)
  reader.readAsDataURL(file)

  const fileExt = file.name.split(".").pop()
  if (!fileExt) {
    toast.error("Arquivo sem extensão não é permitido")
    return
  }

  const safeUserId = user.id.replace(/[^a-zA-Z0-9_-]/g, "")
  const fileName = `${safeUserId}.${fileExt}`

  setLoading(true)
  try {
    // --- Upload no Storage ---
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true })
    if (uploadError) throw uploadError

    // --- URL pública ---
    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)
    const avatarUrl = data.publicUrl

    // --- Atualizar tabela profiles com RLS ---
    // Garante que o usuário só atualize sua própria linha
    const { data: profileData, error: dbError } = await supabase
      .from("profiles")
      .upsert(
        [
          {
            id: user.id,          // id do usuário logado
            avatar_url: avatarUrl,
          },
        ],
        { onConflict: "id" }       // atualiza se já existir
      )
      .select()

    if (dbError) throw dbError

    // --- Atualiza estado local ---
    if (profileData && profileData.length > 0) {
      setProfile((prev) => ({ ...prev, ...profileData[0] }))
    } else {
      setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }))
    }

    toast.success("Avatar atualizado com sucesso!")
  } catch (err: unknown) {
    if (err instanceof Error) toast.error("Erro ao fazer upload do avatar: " + err.message)
    else toast.error("Erro ao fazer upload do avatar")
  } finally {
    setLoading(false)
    setPreviewAvatar(null)
  }
}

  // --- Salvar perfil e email ---
  const handleSave = async () => {
    if (!user) return
    setLoading(true)

    try {
      // Validar email
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error("Email inválido")
        setLoading(false)
        return
      }

      // Upsert perfil
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .upsert(
              [{
                id: user.id,
                name: profile.name,
                last_name: profile.last_name || null,
                phone: profile.phone,
                avatar_url: profile.avatar_url || null,
              }],
              { onConflict: "id" }
            )
        .select()
      if (profileError) throw profileError

      if (profileData && profileData.length > 0) {
        setProfile((prev) => ({ ...prev, ...profileData[0] }))
      }

      // Atualizar email se mudou
      if (email !== user.email) {
        if (updatingEmail) {
          toast("Atualização de email já em andamento")
        } else {
          setUpdatingEmail(true)
          try {
            const { data: authData, error: authError } = await supabase.auth.updateUser({ email })

            if (authError) {
              if (authError.status === 400) {
                toast.error("Email inválido ou já cadastrado")
              } else if (authError.status === 429) {
                toast.error("Muitas tentativas de atualização de email. Aguarde alguns minutos antes de tentar novamente.")
              } else {
                throw authError
              }
            } else {
              setUser({ id: user.id, email: authData.user?.email ?? email })
              setEmailPending(true)
              toast.success("Email alterado! Verifique a confirmação no seu novo email.")
            }
          } catch (err: unknown) {
            if (err instanceof Error) toast.error("Erro ao atualizar email: " + err.message)
            else toast.error("Erro ao atualizar email")
          } finally {
            setUpdatingEmail(false)
          }
        }
      } else {
        toast.success("Perfil atualizado com sucesso!")
      }
    } catch (err: unknown) {
      if (err instanceof Error) toast.error("Erro ao salvar perfil: " + err.message)
      else toast.error("Erro ao salvar perfil")
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="user-profile-wealthy">
  {loading && <p>Carregando...</p>}

<div className="user-profile-header-horizontal">
  <label htmlFor="avatar-upload" className="user-profile-avatar">
    {previewAvatar ? (
      <Image src={previewAvatar} alt="Preview Avatar" width={110} height={110} className="rounded-full" />
    ) : profile.avatar_url ? (
      <Image src={profile.avatar_url} alt="Avatar" width={110} height={110} className="rounded-full" />
    ) : (
      <span>{profile.name?.charAt(0).toUpperCase() || "U"}</span>
    )}
  </label>
  <input id="avatar-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />

  <div className="user-profile-welcome">
    <h2>Olá, {profile.name || "Usuário"}! 👋</h2>
    <p>Bem-vindo ao seu perfil.</p>
  </div>
</div>

  <div className="user-profile-edit">
    <div className="input-wrapper">
      <label>Nome</label>
      <input
  type="text"
  value={`${profile.name || ""} ${profile.last_name || ""}`.trim()}
  onChange={(e) => {
    const value = e.target.value
    const parts = value.split(" ")

    const firstName = parts[0] || ""
    const lastName = parts.slice(1).join(" ") || ""

    setProfile(prev => ({
      ...prev,
      name: firstName,
      last_name: lastName
    }))
  }}
  placeholder="Nome completo"
/>
    </div>

    <div className="input-wrapper">
      <label>Email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      {emailPending && <p>Alteração de email pendente. Verifique seu novo email para confirmação.</p>}
    </div>

    <div className="input-wrapper">
      <label>Telefone</label>
      <input
        type="tel"
        value={profile.phone}
        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
        placeholder="Ex.: +351 912345678"
      />
    </div>
  </div>

  <div className="user-profile-actions">
    <button className="btn-wealthy" onClick={handleSave} disabled={loading || updatingEmail}>Salvar</button>
    <button className="btn-wealthy" onClick={signOut} disabled={loading}>Sair</button>
  </div>

  <div className="user-profile-section">
    <label>Configurações do Perfil</label>
    <p>Aqui podes adicionar notificações, limites de risco e outras configurações de investimento.</p>
  </div>

  <div className={`feedback-toast ${loading ? 'show' : ''}`}>Salvando perfil...</div>
</div>
  )
}