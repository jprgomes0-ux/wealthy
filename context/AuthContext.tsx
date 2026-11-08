"use client"
import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { supabase } from "../lib/supabase"
import { Session, User as SupabaseUser } from "@supabase/supabase-js"

type User = { id: string; email: string | null }
type ProfileData = {
  name: string
  last_name: string
  dob: string
  phone?: string
  address?: string
  investor_profile?: string
  annual_income?: number | null
}

type AuthContextType = {
  user: User | null
  profileExists: boolean
  setUser: (user: User | null) => void
  signUp: (email: string, password: string) => Promise<{ user: SupabaseUser | null; session: Session | null }>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  createProfile: (userId: string, profileData: ProfileData) => Promise<void>
  checkProfile: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profileExists, setProfileExists] = useState(false)

  // Inicializa user e checa perfil
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) {
        const currentUser = {
          id: data.session.user.id,
          email: data.session.user.email ?? null,
        }
        setUser(currentUser)

        // Checar se perfil existe
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single()
        setProfileExists(!!profile)
      }
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? null,
        })
      } else {
        setUser(null)
        setProfileExists(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // SIGN UP
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return { user: data.user, session: data.session }
  }

  // SIGN IN
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    // Atualiza user e checa perfil após login
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) {
      const currentUser = {
        id: data.session.user.id,
        email: data.session.user.email ?? null,
      }
      setUser(currentUser)
      const exists = await checkProfile()
      setProfileExists(exists)
    }
  }

  // SIGN OUT
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfileExists(false)
  }

  // CREATE PROFILE
  const createProfile = async (userId: string, profileData: ProfileData) => {
    const { error } = await supabase.from("profiles").insert([{ id: userId, ...profileData }])
    if (error) throw error
    setProfileExists(true)
  }

  // CHECAR PERFIL
  const checkProfile = async () => {
    if (!user) return false
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    const exists = !!data
    setProfileExists(exists)
    return exists
  }

  return (
    <AuthContext.Provider
      value={{ user, profileExists, setUser, signUp, signIn, signOut, createProfile, checkProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Hook para usar o context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
