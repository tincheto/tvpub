import { useEffect, useState } from 'react'
import { Proposal } from '../types'

interface PublicidadDisplayProps {
  proposal: Proposal
  onComplete: () => void
}

export function PublicidadDisplay({ proposal, onComplete }: PublicidadDisplayProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (!proposal.started_at) {
      setIsActive(false)
      return
    }

    const calculateTimeRemaining = () => {
      const startTime = new Date(proposal.started_at!).getTime()
      const currentTime = new Date().getTime()
      const elapsedSeconds = (currentTime - startTime) / 1000
      const remaining = proposal.duracion_segundos - elapsedSeconds

      if (remaining <= 0) {
        setIsActive(false)
        onComplete()
        return 0
      }

      return Math.ceil(remaining)
    }

    // Calcular tiempo restante inicial
    setTimeRemaining(calculateTimeRemaining())

    // Actualizar cada segundo
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining()
      setTimeRemaining(remaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [proposal, onComplete])

  if (!isActive) {
    return null
  }

  return (
    <div className="relative">
      <div className="bg-gray-900 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
        {proposal.video_url ? (
          <video
            src={proposal.video_url}
            autoPlay
            loop
            muted
            className="max-w-full max-h-[600px]"
          />
        ) : proposal.imagen_url ? (
          <img
            src={proposal.imagen_url}
            alt={proposal.titulo}
            className="max-w-full max-h-[600px] object-contain"
          />
        ) : (
          <div className="text-white text-center">
            <h3 className="text-2xl font-bold mb-2">{proposal.titulo}</h3>
            <p className="text-lg">{proposal.descripcion}</p>
          </div>
        )}
      </div>
      {timeRemaining > 0 && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
          <span className="text-sm font-semibold">
            Tiempo restante: {timeRemaining}s
          </span>
        </div>
      )}
    </div>
  )
}
