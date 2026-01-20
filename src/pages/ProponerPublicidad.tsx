import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Upload, Send } from 'lucide-react'

export function ProponerPublicidad() {
  const { comercioId } = useParams<{ comercioId: string }>()
  const { profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [duracion, setDuracion] = useState(10)
  const [imagenFile, setImagenFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [imagenUrl, setImagenUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Esperar a que termine la carga de autenticación
    if (authLoading) return

    // Validar que hay un comercioId
    if (!comercioId) {
      setError('ID de comercio no válido en la URL')
      return
    }

    // Si no está autenticado, redirigir al login con la URL de retorno
    if (!profile) {
      const returnUrl = `/proponer/${comercioId}`
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}&role=anunciante`, { replace: true })
      return
    }

    // Si está autenticado pero no es anunciante, redirigir
    if (profile.role !== 'anunciante') {
      const returnUrl = `/proponer/${comercioId}`
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}&role=anunciante`, { replace: true })
    }
  }, [profile, authLoading, comercioId, navigate])

  const handleImageUpload = async (file: File) => {
    try {
      setError('')
      setUploadingImage(true)
      
      // Verificar que el usuario esté autenticado
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Debes estar autenticado para subir archivos')
        setLoading(false)
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `publicidad/${fileName}`

      console.log('Uploading image to:', filePath)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('publicidad')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error details:', uploadError)
        throw uploadError
      }

      console.log('Upload successful:', uploadData)

      const {
        data: { publicUrl },
      } = supabase.storage.from('publicidad').getPublicUrl(filePath)

      setImagenUrl(publicUrl)
      setUploadingImage(false)
    } catch (error: any) {
      console.error('Error uploading image:', error)
      setUploadingImage(false)
      if (error.message?.includes('row-level security')) {
        setError('Error de permisos: Verifica que las políticas de Storage estén configuradas correctamente')
      } else {
        setError(`Error al subir la imagen: ${error.message || 'Error desconocido'}`)
      }
    }
  }

  const handleVideoUpload = async (file: File) => {
    try {
      setError('')
      setUploadingVideo(true)
      
      // Verificar que el usuario esté autenticado
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Debes estar autenticado para subir archivos')
        setUploadingVideo(false)
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `publicidad/${fileName}`

      console.log('Uploading video to:', filePath)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('publicidad')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error details:', uploadError)
        throw uploadError
      }

      console.log('Upload successful:', uploadData)

      const {
        data: { publicUrl },
      } = supabase.storage.from('publicidad').getPublicUrl(filePath)

      setVideoUrl(publicUrl)
      setUploadingVideo(false)
    } catch (error: any) {
      console.error('Error uploading video:', error)
      setUploadingVideo(false)
      if (error.message?.includes('row-level security')) {
        setError('Error de permisos: Verifica que las políticas de Storage estén configuradas correctamente')
      } else {
        setError(`Error al subir el video: ${error.message || 'Error desconocido'}`)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!profile || profile.role !== 'anunciante') {
      setError('Debes estar autenticado como anunciante. Por favor, inicia sesión o regístrate.')
      setLoading(false)
      setTimeout(() => navigate('/login'), 2000)
      return
    }

    if (!comercioId) {
      setError('ID de comercio no válido')
      setLoading(false)
      return
    }

    // Obtener anunciante_id
    const { data: anuncianteData, error: anuncianteError } = await supabase
      .from('anunciantes')
      .select('id')
      .eq('user_id', profile.id)
      .single()

    if (anuncianteError || !anuncianteData) {
      setError('Error al obtener datos del anunciante')
      setLoading(false)
      return
    }

    try {
      const { error: proposalError } = await supabase.from('proposals').insert({
        comercio_id: comercioId,
        anunciante_id: anuncianteData.id,
        titulo,
        descripcion,
        imagen_url: imagenUrl || null,
        video_url: videoUrl || null,
        duracion_segundos: duracion,
        status: 'pending',
      })

      if (proposalError) throw proposalError

      setSuccess(true)
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (error: any) {
      console.error('Error creating proposal:', error)
      setError('Error al crear la propuesta')
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading mientras se verifica la autenticación
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl">Cargando...</div>
        </div>
      </div>
    )
  }

  // Si no hay comercioId, mostrar error
  if (!comercioId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Error
          </h2>
          <p className="text-gray-600 mb-6">
            No se encontró el ID del comercio en la URL.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    )
  }

  // Si no está autenticado, el useEffect ya redirigió, mostrar loading
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl">Redirigiendo al login...</div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Propuesta Enviada
          </h2>
          <p className="text-gray-600">
            Tu propuesta ha sido enviada exitosamente. El comercio la revisará pronto.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          Proponer Publicidad
        </h1>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título de la Publicidad
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ej: Oferta Especial de Verano"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={4}
                placeholder="Describe tu propuesta de publicidad..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración (segundos)
              </label>
              <input
                type="number"
                value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value))}
                min="5"
                max="60"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagen (opcional)
              </label>
              <div className="flex items-center gap-4">
                <label className={`flex-1 cursor-pointer ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
                    <Upload className="mx-auto mb-2" size={24} />
                    <span className="text-sm text-gray-600">
                      {uploadingImage ? 'Subiendo...' : imagenFile ? imagenFile.name : 'Seleccionar imagen'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setImagenFile(file)
                        handleImageUpload(file)
                      }
                    }}
                  />
                </label>
              </div>
              {imagenUrl && (
                <img
                  src={imagenUrl}
                  alt="Preview"
                  className="mt-4 max-w-full h-48 object-cover rounded-lg"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video (opcional)
              </label>
              <div className="flex items-center gap-4">
                <label className={`flex-1 cursor-pointer ${uploadingVideo ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
                    <Upload className="mx-auto mb-2" size={24} />
                    <span className="text-sm text-gray-600">
                      {uploadingVideo ? 'Subiendo...' : videoFile ? videoFile.name : 'Seleccionar video'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    disabled={uploadingVideo}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setVideoFile(file)
                        handleVideoUpload(file)
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                'Enviando...'
              ) : (
                <>
                  <Send size={20} /> Enviar Propuesta
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
