import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { ComercioDashboard } from './pages/ComercioDashboard'
import { AnuncianteDashboard } from './pages/AnuncianteDashboard'
import { ProponerPublicidad } from './pages/ProponerPublicidad'
import { LogOut } from 'lucide-react'

function AppRoutes() {
  const { profile, signOut } = useAuth()

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="min-h-screen">
        {profile && (
          <nav className="bg-white shadow-md p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold text-gray-800">TVPub</h1>
              <div className="flex items-center gap-4">
                <span className="text-gray-600">
                  {profile.nombre} ({profile.role})
                </span>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <LogOut size={18} /> Salir
                </button>
              </div>
            </div>
          </nav>
        )}

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/proponer/:comercioId"
            element={<ProponerPublicidad />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                {profile?.role === 'comercio' ? (
                  <ComercioDashboard />
                ) : profile?.role === 'anunciante' ? (
                  <AnuncianteDashboard />
                ) : (
                  <Navigate to="/login" replace />
                )}
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
