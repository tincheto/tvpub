import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, UserProfile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, role: 'comercio' | 'anunciante', nombre: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading profile for user:', userId)
      
      // Verificar que tenemos una sesión activa
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) {
        console.log('No active session, cannot load profile')
        setLoading(false)
        return
      }

      // Buscar en la tabla de perfiles de usuario
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error loading profile:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          status: (error as any).status,
        })
        
        // PGRST116 es "no rows returned", que es normal si el perfil no existe aún
        if (error.code === 'PGRST116') {
          console.log('Profile not found (this is normal if user just registered)')
          setLoading(false)
          return
        }
        
        // Si es un error 406, puede ser un problema de headers o RLS
        if (error.message?.includes('406') || (error as any).status === 406) {
          console.error('Error 406: Verifica:')
          console.error('1. Que las políticas RLS estén correctamente configuradas')
          console.error('2. Que el usuario tenga permisos para leer su propio perfil')
          console.error('3. Que la tabla user_profiles exista y tenga los permisos correctos')
        }
        setLoading(false)
        return
      }

      if (data) {
        console.log('Profile loaded successfully:', data)
        setProfile({
          id: data.user_id,
          email: user?.email || '',
          role: data.role,
          nombre: data.nombre,
          comercio_id: data.comercio_id,
        })
      } else {
        // Si no hay perfil, puede que aún no se haya creado
        console.log('No profile found for user:', userId)
      }
    } catch (error: any) {
      console.error('Exception loading profile:', error)
      if (error.status === 406) {
        console.error('Error 406: Verifica la configuración de Supabase y las políticas RLS')
      }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    if (data.user) {
      await loadUserProfile(data.user.id)
    }
  }

  const signUp = async (
    email: string,
    password: string,
    role: 'comercio' | 'anunciante',
    nombre: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error

    if (data.user) {
      // Esperar un momento para que la sesión se establezca
      // y verificar la sesión actual
      const { data: { session } } = await supabase.auth.getSession()
      
      // Si no hay sesión, el usuario necesita confirmar su email
      // Pero aún así podemos crear los registros usando las funciones con SECURITY DEFINER
      
      // Crear perfil de usuario
      const profileData: any = {
        user_id: data.user.id,
        role,
        nombre,
      }

      // Si es comercio, crear registro en tabla comercios usando función helper
      if (role === 'comercio') {
        const { data: comercioId, error: comercioError } = await supabase.rpc(
          'create_comercio',
          {
            p_nombre: nombre,
            p_user_id: data.user.id,
          }
        )

        if (comercioError) {
          console.error('Error creating comercio:', comercioError)
          throw comercioError
        }
        profileData.comercio_id = comercioId
      } else {
        // Si es anunciante, crear registro en tabla anunciantes usando función helper
        const { error: anuncianteError } = await supabase.rpc(
          'create_anunciante',
          {
            p_nombre: nombre,
            p_user_id: data.user.id,
          }
        )

        if (anuncianteError) {
          console.error('Error creating anunciante:', anuncianteError)
          throw anuncianteError
        }
      }

      // Crear perfil de usuario usando función helper
      console.log('Creating user profile with data:', {
        p_user_id: data.user.id,
        p_role: role,
        p_nombre: nombre,
        p_comercio_id: profileData.comercio_id || null,
      })

      const { data: profileResult, error: profileError } = await supabase.rpc('create_user_profile', {
        p_user_id: data.user.id,
        p_role: role,
        p_nombre: nombre,
        p_comercio_id: profileData.comercio_id || null,
      })

      if (profileError) {
        console.error('Error creating profile with RPC:', profileError)
        
        // Si la función RPC falla, intentar insertar directamente
        console.log('Attempting direct insert as fallback...')
        const { error: directInsertError } = await supabase
          .from('user_profiles')
          .insert(profileData)

        if (directInsertError) {
          console.error('Error with direct insert:', directInsertError)
          throw new Error(`Error creating profile: ${directInsertError.message}`)
        } else {
          console.log('Profile created successfully with direct insert')
        }
      } else {
        console.log('Profile created successfully with RPC:', profileResult)
      }

      // Esperar un momento para que la base de datos se actualice
      await new Promise(resolve => setTimeout(resolve, 500))

      // Intentar cargar el perfil
      if (session) {
        await loadUserProfile(data.user.id)
      } else {
        // Si no hay sesión, intentar cargar el perfil de todas formas
        console.log('No session, but attempting to load profile anyway...')
        await loadUserProfile(data.user.id)
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
