import { useState, useEffect, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Proposal, ProposalStatus } from '../types'
import { Check, X, Image as ImageIcon, Video, Store, Clock, FileText, QrCode } from 'lucide-react'
import { PublicidadDisplay } from '../components/PublicidadDisplay'

export function ComercioDashboard() {
  const { profile } = useAuth()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [qrUrl, setQrUrl] = useState('')

  // Función para verificar si una propuesta aceptada aún está activa
  const isProposalActive = (proposal: Proposal): boolean => {
    if (proposal.status !== 'accepted' || !proposal.started_at) {
      return false
    }

    const startTime = new Date(proposal.started_at).getTime()
    const currentTime = new Date().getTime()
    const elapsedSeconds = (currentTime - startTime) / 1000

    return elapsedSeconds < proposal.duracion_segundos
  }

  // Encontrar la propuesta aceptada que esté activa (usando useMemo para evitar recálculos innecesarios)
  const activeProposal = useMemo(() => {
    return proposals.find(
      (p) => p.status === 'accepted' && isProposalActive(p)
    )
  }, [proposals])

  useEffect(() => {
    if (profile?.comercio_id) {
      const url = `${window.location.origin}/proponer/${profile.comercio_id}`
      setQrUrl(url)
      loadProposals()
    }
  }, [profile])

  // Verificar periódicamente si la publicidad activa ha expirado
  useEffect(() => {
    if (!activeProposal) return

    const interval = setInterval(() => {
      // Solo recargar si la propuesta activa ha expirado
      const startTime = new Date(activeProposal.started_at!).getTime()
      const currentTime = new Date().getTime()
      const elapsedSeconds = (currentTime - startTime) / 1000

      if (elapsedSeconds >= activeProposal.duracion_segundos) {
        loadProposals()
      }
    }, 1000) // Verificar cada segundo

    return () => clearInterval(interval)
  }, [activeProposal])

  const loadProposals = async () => {
    if (!profile?.comercio_id) return

    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('comercio_id', profile.comercio_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProposals(data || [])
    } catch (error) {
      console.error('Error loading proposals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProposalAction = async (proposalId: string, status: ProposalStatus) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      }

      // Si se acepta, guardar el tiempo de inicio
      if (status === 'accepted') {
        updateData.started_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', proposalId)

      if (error) throw error
      await loadProposals()
    } catch (error) {
      console.error('Error updating proposal:', error)
      alert('Error al actualizar la propuesta')
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header mejorado */}
        <div className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-white/20 p-3 rounded-xl">
              <Store size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-1">
                Panel de Comercio
              </h1>
              <p className="text-blue-100 text-lg">
                {profile?.nombre || 'Tu espacio publicitario'}
              </p>
            </div>
          </div>
        </div>

        {activeProposal ? (
          <div className="mb-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl p-8 border-2 border-green-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-green-500 p-3 rounded-xl text-white">
                <Video size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-green-700">
                  Publicidad Activa
                </h2>
                <p className="text-green-600 text-sm">Reproduciendo ahora</p>
              </div>
            </div>
            <PublicidadDisplay proposal={activeProposal} onComplete={() => loadProposals()} />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* QR Code Section */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                  <QrCode size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Código QR
                  </h2>
                  <p className="text-gray-500 text-sm">Comparte con anunciantes</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-4">
                <p className="text-gray-700 mb-4 text-center font-semibold text-lg">
                  Escanear acá para hacer una propuesta de publicidad para nuestro espacio
                </p>
                {qrUrl && (
                  <div className="flex justify-center bg-white p-6 rounded-xl shadow-inner">
                    <QRCodeSVG value={qrUrl} size={280} />
                  </div>
                )}
              </div>
              {qrUrl && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1 font-semibold">URL del QR:</p>
                  <p className="text-sm text-gray-700 break-all font-mono">{qrUrl}</p>
                </div>
              )}
            </div>

            {/* Proposals List */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
                  <FileText size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Propuesta Recibida
                  </h2>
                  <p className="text-gray-500 text-sm">Última propuesta</p>
                </div>
              </div>
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p className="mt-4 text-gray-500">Cargando...</p>
                </div>
              ) : proposals.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg font-medium">No hay propuestas aún</p>
                  <p className="text-gray-400 text-sm mt-2">Comparte tu QR para recibir propuestas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mostrar solo la propuesta más reciente */}
                  {(() => {
                    const latestProposal = proposals[0] // Ya está ordenado por created_at descendente
                    return (
                      <div
                        key={latestProposal.id}
                        className={`border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
                          latestProposal.status === 'accepted'
                            ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50'
                            : latestProposal.status === 'rejected'
                            ? 'border-red-400 bg-gradient-to-br from-red-50 to-pink-50'
                            : 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50'
                        }`}
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-bold text-xl text-gray-800">
                                  {latestProposal.titulo}
                                </h3>
                                {latestProposal.status === 'pending' && (
                                  <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full">
                                    Pendiente
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 mb-4">
                                {latestProposal.descripcion}
                              </p>
                              <div className="flex items-center gap-4 text-sm">
                                {latestProposal.imagen_url && (
                                  <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                                    <ImageIcon size={16} /> Imagen
                                  </span>
                                )}
                                {latestProposal.video_url && (
                                  <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                                    <Video size={16} /> Video
                                  </span>
                                )}
                                <span className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
                                  <Clock size={16} /> {latestProposal.duracion_segundos}s
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Vista previa de imagen o video */}
                          {(latestProposal.imagen_url || latestProposal.video_url) && (
                            <div className="mt-4 bg-white rounded-xl p-3 shadow-inner">
                              {latestProposal.video_url ? (
                                <video
                                  src={latestProposal.video_url}
                                  controls
                                  className="w-full max-h-72 rounded-lg object-contain"
                                  preload="metadata"
                                >
                                  Tu navegador no soporta videos.
                                </video>
                              ) : latestProposal.imagen_url ? (
                                <img
                                  src={latestProposal.imagen_url}
                                  alt={latestProposal.titulo}
                                  className="w-full max-h-72 rounded-lg object-contain"
                                />
                              ) : null}
                            </div>
                          )}
                        </div>
                        {latestProposal.status === 'pending' && (
                          <div className="flex gap-3 mt-6">
                            <button
                              onClick={() => handleProposalAction(latestProposal.id, 'accepted')}
                              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold text-lg"
                            >
                              <Check size={22} /> Aceptar
                            </button>
                            <button
                              onClick={() => handleProposalAction(latestProposal.id, 'rejected')}
                              className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold text-lg"
                            >
                              <X size={22} /> Rechazar
                            </button>
                          </div>
                        )}
                        {latestProposal.status === 'accepted' && (
                          <div className="mt-4 flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-xl font-semibold">
                            <Check size={20} className="text-green-600" />
                            Propuesta Aceptada
                          </div>
                        )}
                        {latestProposal.status === 'rejected' && (
                          <div className="mt-4 flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-xl font-semibold">
                            <X size={20} className="text-red-600" />
                            Propuesta Rechazada
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mostrar lista de propuestas también cuando hay publicidad activa (en una sección separada) */}
        {activeProposal && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
                <FileText size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Propuesta Recibida
                </h2>
                <p className="text-gray-500 text-sm">Última propuesta</p>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="mt-4 text-gray-500">Cargando...</p>
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-medium">No hay propuestas aún</p>
                <p className="text-gray-400 text-sm mt-2">Comparte tu QR para recibir propuestas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mostrar solo la propuesta más reciente */}
                {(() => {
                  const latestProposal = proposals[0] // Ya está ordenado por created_at descendente
                  return (
                    <div
                      key={latestProposal.id}
                      className={`border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
                        latestProposal.status === 'accepted'
                          ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50'
                          : latestProposal.status === 'rejected'
                          ? 'border-red-400 bg-gradient-to-br from-red-50 to-pink-50'
                          : 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50'
                      }`}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-xl text-gray-800">
                                {latestProposal.titulo}
                              </h3>
                              {latestProposal.status === 'pending' && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full">
                                  Pendiente
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 mb-4">
                              {latestProposal.descripcion}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              {latestProposal.imagen_url && (
                                <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                                  <ImageIcon size={16} /> Imagen
                                </span>
                              )}
                              {latestProposal.video_url && (
                                <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                                  <Video size={16} /> Video
                                </span>
                              )}
                              <span className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
                                <Clock size={16} /> {latestProposal.duracion_segundos}s
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Vista previa de imagen o video */}
                        {(latestProposal.imagen_url || latestProposal.video_url) && (
                          <div className="mt-4 bg-white rounded-xl p-3 shadow-inner">
                            {latestProposal.video_url ? (
                              <video
                                src={latestProposal.video_url}
                                controls
                                className="w-full max-h-72 rounded-lg object-contain"
                                preload="metadata"
                              >
                                Tu navegador no soporta videos.
                              </video>
                            ) : latestProposal.imagen_url ? (
                              <img
                                src={latestProposal.imagen_url}
                                alt={latestProposal.titulo}
                                className="w-full max-h-72 rounded-lg object-contain"
                              />
                            ) : null}
                          </div>
                        )}
                      </div>
                      {latestProposal.status === 'pending' && (
                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => handleProposalAction(latestProposal.id, 'accepted')}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold text-lg"
                          >
                            <Check size={22} /> Aceptar
                          </button>
                          <button
                            onClick={() => handleProposalAction(latestProposal.id, 'rejected')}
                            className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold text-lg"
                          >
                            <X size={22} /> Rechazar
                          </button>
                        </div>
                      )}
                      {latestProposal.status === 'accepted' && (
                        <div className="mt-4 flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-xl font-semibold">
                          <Check size={20} className="text-green-600" />
                          Propuesta Aceptada
                        </div>
                      )}
                      {latestProposal.status === 'rejected' && (
                        <div className="mt-4 flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-xl font-semibold">
                          <X size={20} className="text-red-600" />
                          Propuesta Rechazada
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
              )}
            </div>
          )}
      </div>
    </div>
  )
}
