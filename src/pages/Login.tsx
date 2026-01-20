import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Store, Megaphone } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [role, setRole] = useState<'comercio' | 'anunciante'>('comercio')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Obtener parámetros de la URL
  const returnUrl = searchParams.get('returnUrl')
  const roleParam = searchParams.get('role')

  // Si hay un parámetro de rol, establecerlo automáticamente
  useEffect(() => {
    if (roleParam === 'anunciante') {
      setRole('anunciante')
    } else if (roleParam === 'comercio') {
      setRole('comercio')
    }
  }, [roleParam])

  // Si el usuario ya está autenticado y hay una URL de retorno, redirigir
  useEffect(() => {
    if (profile && returnUrl) {
      navigate(returnUrl)
    } else if (profile && !returnUrl) {
      navigate('/')
    }
  }, [profile, returnUrl, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        if (!nombre.trim()) {
          setError('El nombre es requerido')
          setLoading(false)
          return
        }
        await signUp(email, password, role, nombre)
        // Esperar un momento para que se complete el registro
        await new Promise(resolve => setTimeout(resolve, 1000))
      } else {
        await signIn(email, password)
      }
      
      // Redirigir a la URL de retorno si existe, o al dashboard correspondiente
      if (returnUrl) {
        navigate(returnUrl)
      } else {
        navigate('/')
      }
    } catch (err: any) {
      console.error('Error en autenticación:', err)
      setError(err.message || 'Error al autenticar. Verifica la consola para más detalles.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          TVPub
        </h1>

        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => {
              setRole('comercio')
              setError('')
            }}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              role === 'comercio'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Store className="mx-auto mb-2" size={32} />
            <div className="font-semibold">Comercio</div>
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('anunciante')
              setError('')
            }}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              role === 'anunciante'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Megaphone className="mx-auto mb-2" size={32} />
            <div className="font-semibold">Anunciante</div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nombre del comercio/anunciante"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Cargando...' : isSignUp ? 'Registrarse' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
            }}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            {isSignUp
              ? '¿Ya tienes cuenta? Inicia sesión'
              : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </div>
    </div>
  )
}
