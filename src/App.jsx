import { AuthProvider, useAuth } from './context/AuthContext'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import RegisterEmployee from './pages/RegisterEmployee'
import EmployeesList from './pages/EmployeesList'
import Attendance from './pages/Attendance'
import DashboardLayout from './layouts/DashboardLayout'

// Componente para proteger rutas privadas
const PrivateRoute = ({ children }) => {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" />
  }

  return <DashboardLayout>{children}</DashboardLayout>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />

          <Route path="/register-employee" element={
            <PrivateRoute>
              <RegisterEmployee />
            </PrivateRoute>
          } />

          <Route path="/attendance" element={
            <PrivateRoute>
              <Attendance />
            </PrivateRoute>
          } />

          {/* Ruta para editar empleado */}
          <Route path="/edit-employee/:id" element={
            <PrivateRoute>
              <RegisterEmployee />
            </PrivateRoute>
          } />

          {/* Ruta dinámica para listar empleados por sede */}
          <Route path="/employees/:sede" element={
            <PrivateRoute>
              <EmployeesList />
            </PrivateRoute>
          } />

          {/* Redirigir cualquier otra ruta a home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
