import { useState, useEffect, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Proposal, ProposalStatus } from '../types'
import { Check, X, Image as ImageIcon, Video } from 'lucide-react'
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          Panel de Comercio
        </h1>

        {activeProposal ? (
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-green-600">
              Publicidad Activa
            </h2>
            <PublicidadDisplay proposal={activeProposal} onComplete={() => loadProposals()} />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* QR Code Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Código QR para Propuestas
              </h2>
              <p className="text-gray-600 mb-4 text-center font-medium">
                Escanear acá para hacer una propuesta de publicidad para nuestro espacio
              </p>
              {qrUrl && (
                <div className="flex justify-center bg-white p-4 rounded-lg">
                  <QRCodeSVG value={qrUrl} size={256} />
                </div>
              )}
              {qrUrl && (
                <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600 break-all">{qrUrl}</p>
                </div>
              )}
            </div>

            {/* Proposals List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Propuesta Recibida
              </h2>
              {loading ? (
                <div className="text-center py-8">Cargando...</div>
              ) : proposals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay propuestas aún
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mostrar solo la propuesta más reciente */}
                  {(() => {
                    const latestProposal = proposals[0] // Ya está ordenado por created_at descendente
                    return (
                      <div
                        key={latestProposal.id}
                        className={`border-2 rounded-lg p-4 ${
                          latestProposal.status === 'accepted'
                            ? 'border-green-500 bg-green-50'
                            : latestProposal.status === 'rejected'
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-800 mb-2">
                              {latestProposal.titulo}
                            </h3>
                            <p className="text-gray-600 text-sm mb-3">
                              {latestProposal.descripcion}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              {latestProposal.imagen_url && (
                                <span className="flex items-center gap-1">
                                  <ImageIcon size={16} /> Imagen
                                </span>
                              )}
                              {latestProposal.video_url && (
                                <span className="flex items-center gap-1">
                                  <Video size={16} /> Video
                                </span>
                              )}
                              <span>Duración: {latestProposal.duracion_segundos}s</span>
                            </div>
                          </div>
                          
                          {/* Vista previa de imagen o video */}
                          {(latestProposal.imagen_url || latestProposal.video_url) && (
                            <div className="mt-3 bg-gray-100 rounded-lg p-2">
                              {latestProposal.video_url ? (
                                <video
                                  src={latestProposal.video_url}
                                  controls
                                  className="w-full max-h-64 rounded-lg object-contain"
                                  preload="metadata"
                                >
                                  Tu navegador no soporta videos.
                                </video>
                              ) : latestProposal.imagen_url ? (
                                <img
                                  src={latestProposal.imagen_url}
                                  alt={latestProposal.titulo}
                                  className="w-full max-h-64 rounded-lg object-contain"
                                />
                              ) : null}
                            </div>
                          )}
                        </div>
                        {latestProposal.status === 'pending' && (
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => handleProposalAction(latestProposal.id, 'accepted')}
                              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Check size={20} /> Aceptar
                            </button>
                            <button
                              onClick={() => handleProposalAction(latestProposal.id, 'rejected')}
                              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <X size={20} /> Rechazar
                            </button>
                          </div>
                        )}
                        {latestProposal.status === 'accepted' && (
                          <div className="mt-2 text-green-600 font-semibold">
                            ✓ Aceptada
                          </div>
                        )}
                        {latestProposal.status === 'rejected' && (
                          <div className="mt-2 text-red-600 font-semibold">
                            ✗ Rechazada
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
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Propuesta Recibida
            </h2>
            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay propuestas aún
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mostrar solo la propuesta más reciente */}
                {(() => {
                  const latestProposal = proposals[0] // Ya está ordenado por created_at descendente
                  return (
                    <div
                      key={latestProposal.id}
                      className={`border-2 rounded-lg p-4 ${
                        latestProposal.status === 'accepted'
                          ? 'border-green-500 bg-green-50'
                          : latestProposal.status === 'rejected'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-800 mb-2">
                            {latestProposal.titulo}
                          </h3>
                          <p className="text-gray-600 text-sm mb-3">
                            {latestProposal.descripcion}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {latestProposal.imagen_url && (
                              <span className="flex items-center gap-1">
                                <ImageIcon size={16} /> Imagen
                              </span>
                            )}
                            {latestProposal.video_url && (
                              <span className="flex items-center gap-1">
                                <Video size={16} /> Video
                              </span>
                            )}
                            <span>Duración: {latestProposal.duracion_segundos}s</span>
                          </div>
                        </div>
                        
                        {/* Vista previa de imagen o video */}
                        {(latestProposal.imagen_url || latestProposal.video_url) && (
                          <div className="mt-3 bg-gray-100 rounded-lg p-2">
                            {latestProposal.video_url ? (
                              <video
                                src={latestProposal.video_url}
                                controls
                                className="w-full max-h-64 rounded-lg object-contain"
                                preload="metadata"
                              >
                                Tu navegador no soporta videos.
                              </video>
                            ) : latestProposal.imagen_url ? (
                              <img
                                src={latestProposal.imagen_url}
                                alt={latestProposal.titulo}
                                className="w-full max-h-64 rounded-lg object-contain"
                              />
                            ) : null}
                          </div>
                        )}
                      </div>
                      {latestProposal.status === 'pending' && (
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleProposalAction(latestProposal.id, 'accepted')}
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Check size={20} /> Aceptar
                          </button>
                          <button
                            onClick={() => handleProposalAction(latestProposal.id, 'rejected')}
                            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <X size={20} /> Rechazar
                          </button>
                        </div>
                      )}
                      {latestProposal.status === 'accepted' && (
                        <div className="mt-2 text-green-600 font-semibold">
                          ✓ Aceptada
                        </div>
                      )}
                      {latestProposal.status === 'rejected' && (
                        <div className="mt-2 text-red-600 font-semibold">
                          ✗ Rechazada
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
