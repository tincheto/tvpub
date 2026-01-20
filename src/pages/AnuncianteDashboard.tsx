import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { Link, Camera, X, Megaphone, ScanLine, Globe, Info } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header mejorado */}
        <div className="mb-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-white/20 p-3 rounded-xl">
              <Megaphone size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-1">
                Panel de Anunciante
              </h1>
              <p className="text-purple-100 text-lg">Crea y envía propuestas de publicidad</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Opción 1: Escanear QR */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
                <ScanLine size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Escanear QR
                </h2>
                <p className="text-gray-500 text-sm">Usa tu cámara</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Escanea el código QR del comercio para hacer una propuesta de publicidad.
            </p>

            {!scanning ? (
              <button
                onClick={startScanning}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
              >
                <Camera size={22} /> Iniciar Escáner
              </button>
            ) : (
              <div className="space-y-4">
                <div
                  id={qrCodeRegionId}
                  className="w-full min-h-[300px] rounded-xl overflow-hidden bg-gray-100 border-2 border-purple-200"
                />
                <button
                  onClick={stopScanning}
                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-4 rounded-xl font-semibold hover:from-red-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
                >
                  <X size={22} /> Detener Escáner
                </button>
              </div>
            )}
          </div>

          {/* Opción 2: Ingresar URL */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
                <Globe size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Ingresar URL
                </h2>
                <p className="text-gray-500 text-sm">URL manual</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Ingresa la URL del código QR del comercio para hacer una propuesta.
            </p>

            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://... o ID del comercio"
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
              >
                <Link size={22} /> Continuar
              </button>
            </form>
          </div>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-lg">
            <div className="flex items-center gap-2 font-semibold">
              <X size={20} />
              {error}
            </div>
          </div>
        )}

        <div className="mt-8 bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-xl p-8 border border-purple-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
              <Info size={24} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">
              Instrucciones
            </h3>
          </div>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">1</span>
              <span>Escanea el QR del comercio o ingresa su URL</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">2</span>
              <span>Completa el formulario con los detalles de tu propuesta</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">3</span>
              <span>Sube una imagen o video de tu publicidad</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">4</span>
              <span>El comercio revisará y decidirá si acepta tu propuesta</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
