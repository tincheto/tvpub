import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { QrCode, Link, Camera, X } from 'lucide-react'

export function AnuncianteDashboard() {
  const navigate = useNavigate()
  const [urlInput, setUrlInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const qrCodeRegionId = 'qr-reader'

  useEffect(() => {
    return () => {
      // Limpiar el scanner al desmontar
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current = null
          })
          .catch(() => {
            scannerRef.current = null
          })
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      setError('')
      setScanning(true)

      // Verificar si hay cámaras disponibles
      const devices = await Html5Qrcode.getCameras()
      if (devices && devices.length === 0) {
        setError('No se encontraron cámaras disponibles en tu dispositivo.')
        setScanning(false)
        return
      }

      const html5QrCode = new Html5Qrcode(qrCodeRegionId)
      scannerRef.current = html5QrCode

      // Intentar primero con cámara trasera (environment), si falla intentar con frontal (user)
      let cameraId: string | { facingMode: string } | null = null
      
      try {
        // Buscar cámara trasera
        const backCamera = devices.find((device: any) => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        )
        
        if (backCamera) {
          cameraId = backCamera.id
        } else {
          // Si no hay cámara trasera, usar la primera disponible
          cameraId = devices[0].id
        }
      } catch {
        // Si falla, usar facingMode como fallback
        cameraId = { facingMode: 'environment' }
      }

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // QR escaneado exitosamente
          handleQrScanned(decodedText)
        },
        () => {
          // Ignorar errores de escaneo continuo
        }
      )
    } catch (err: any) {
      console.error('Error starting scanner:', err)
      
      let errorMessage = 'Error al iniciar el escáner. '
      
      if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
        errorMessage += 'Por favor, permite el acceso a la cámara en la configuración de tu navegador.'
      } else if (err.name === 'NotFoundError' || err.message?.includes('camera')) {
        errorMessage += 'No se encontró ninguna cámara disponible.'
      } else if (err.name === 'NotReadableError' || err.message?.includes('readable')) {
        errorMessage += 'La cámara está siendo usada por otra aplicación. Cierra otras aplicaciones que usen la cámara.'
      } else {
        errorMessage += `Detalles: ${err.message || 'Error desconocido'}. Asegúrate de permitir el acceso a la cámara.`
      }
      
      setError(errorMessage)
      setScanning(false)
      
      // Limpiar el scanner en caso de error
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop()
        } catch {
          // Ignorar errores al detener
        }
        scannerRef.current = null
      }
    }
  }

  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      }
      setScanning(false)
    } catch (err) {
      console.error('Error stopping scanner:', err)
    }
  }

  const handleQrScanned = (url: string) => {
    stopScanning()
    // Extraer el ID del comercio de la URL
    const match = url.match(/\/proponer\/([^/]+)/)
    if (match && match[1]) {
      navigate(`/proponer/${match[1]}`)
    } else {
      setError('URL del QR no válida')
    }
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!urlInput.trim()) {
      setError('Por favor ingresa una URL')
      return
    }

    // Extraer el ID del comercio de la URL
    const match = urlInput.match(/\/proponer\/([^/]+)/)
    if (match && match[1]) {
      navigate(`/proponer/${match[1]}`)
    } else {
      // Si no tiene el formato completo, intentar extraer solo el ID
      const comercioId = urlInput.trim()
      if (comercioId) {
        navigate(`/proponer/${comercioId}`)
      } else {
        setError('URL no válida. Debe contener el ID del comercio o la URL completa.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          Panel de Anunciante
        </h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Opción 1: Escanear QR */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <QrCode className="text-purple-600" size={32} />
              <h2 className="text-2xl font-semibold text-gray-800">
                Escanear QR
              </h2>
            </div>
            <p className="text-gray-600 mb-4">
              Escanea el código QR del comercio para hacer una propuesta de publicidad.
            </p>

            {!scanning ? (
              <button
                onClick={startScanning}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <Camera size={20} /> Iniciar Escáner
              </button>
            ) : (
              <div className="space-y-4">
                <div
                  id={qrCodeRegionId}
                  className="w-full min-h-[300px] rounded-lg overflow-hidden bg-gray-100"
                />
                <button
                  onClick={stopScanning}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={20} /> Detener Escáner
                </button>
              </div>
            )}
          </div>

          {/* Opción 2: Ingresar URL */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Link className="text-purple-600" size={32} />
              <h2 className="text-2xl font-semibold text-gray-800">
                Ingresar URL
              </h2>
            </div>
            <p className="text-gray-600 mb-4">
              Ingresa la URL del código QR del comercio para hacer una propuesta.
            </p>

            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://... o ID del comercio"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <Link size={20} /> Continuar
              </button>
            </form>
          </div>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Instrucciones
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li>• Escanea el QR del comercio o ingresa su URL</li>
            <li>• Completa el formulario con los detalles de tu propuesta</li>
            <li>• Sube una imagen o video de tu publicidad</li>
            <li>• El comercio revisará y decidirá si acepta tu propuesta</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
