import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmail } from '../services/auth'
import { useAuth } from '../context/AuthContext'
import { User, Lock, Eye, EyeOff } from 'lucide-react'
import bgImage from '../assets/imagen_pauser.jpg'

export default function Login() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Redirección reactiva: Si ya hay sesión, ir al dashboard
  useEffect(() => {
    if (session) {
      navigate('/', { replace: true })
    }
  }, [session, navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!email || !password) {
      setError('Por favor ingrese correo y contraseña')
      setLoading(false)
      return
    }

    try {
      console.log('Intentando iniciar sesión con:', email)
      const { data, error } = await signInWithEmail(email, password)
      
      if (error) {
        console.error('Error detallado de Supabase:', error)
        throw error
      }
      
      console.log('Login exitoso, esperando actualización de sesión...')
      // No navegamos manualmente aquí. Esperamos a que el useEffect detecte la sesión.
      
    } catch (err) {
      console.error('Error capturado:', err)
      if (err.message.includes('Invalid login credentials')) {
        setError('Correo o contraseña incorrectos.')
      } else if (err.message.includes('Email not confirmed')) {
        setError('Por favor verifica tu correo electrónico antes de ingresar.')
      } else {
        setError(err.message || 'Error al iniciar sesión')
      }
      setLoading(false) // Solo detenemos loading si hubo error
    } 
    // Nota: Si el login es exitoso, mantenemos loading en true hasta que el useEffect redirija
  }

  return (
    <div className="min-h-screen flex w-full">
      {/* Sección Izquierda - Imagen */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-blue-600">
        <img 
          src={bgImage} 
          alt="Fondo Pauser" 
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
        />
        <div className="relative z-10 w-full h-full flex flex-col justify-center px-12 text-white">
          <h1 className="text-5xl font-bold mb-6">Bienvenido a PAUSER</h1>
          <p className="text-xl text-blue-100 max-w-lg">
            Plataforma integral para la gestión de Recursos Humanos, control de asistencias y administración de personal.
          </p>
        </div>
        {/* Elementos decorativos estilo referencia */}
        <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-tr from-blue-900/40 to-transparent pointer-events-none"></div>
      </div>

      {/* Sección Derecha - Formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">INICIAR SESIÓN</h2>
            <p className="text-gray-500">Ingrese sus credenciales para acceder</p>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-6 border border-red-100 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-red-600"></div>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              {/* Campo Usuario */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  className="block w-full pl-11 pr-4 py-4 bg-gray-50 border border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                />
              </div>

              {/* Campo Contraseña */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="block w-full pl-11 pr-12 py-4 bg-gray-50 border border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-gray-500 cursor-pointer select-none">
                  Recordarme
                </label>
              </div>
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                ¿Olvidó su contraseña?
              </a>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`
                w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white 
                bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-200 hover:scale-[1.02]
                ${loading ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'INGRESAR'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-400">
            © 2024 Pauser Distribuciones. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
