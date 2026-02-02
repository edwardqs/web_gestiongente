import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import RegisterEmployee from './pages/RegisterEmployee'
import EmployeesList from './pages/EmployeesList'
import AttendanceList from './pages/AttendanceList'
import RequestsList from './pages/RequestsList'
import CalendarRequests from './pages/CalendarRequests'
import RolesManagement from './pages/RolesManagement'
import PositionsManagement from './pages/PositionsManagement'
import PapeletaVacaciones from './components/PapeletaVacaciones'
import DashboardLayout from './layouts/DashboardLayout'

// Componente para proteger rutas privadas
const PrivateRoute = ({ children }) => {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <DashboardLayout>{children}</DashboardLayout>
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <PrivateRoute>
              <ProtectedRoute module="dashboard">
                <Dashboard />
              </ProtectedRoute>
            </PrivateRoute>
          } />

          <Route path="/register-employee" element={
            <PrivateRoute>
              <ProtectedRoute module="employees" requiredAction="write">
                <RegisterEmployee />
              </ProtectedRoute>
            </PrivateRoute>
          } />

          {/* Ruta para editar empleado */}
          <Route path="/edit-employee/:id" element={
            <PrivateRoute>
              <ProtectedRoute module="employees" requiredAction="write">
                <RegisterEmployee />
              </ProtectedRoute>
            </PrivateRoute>
          } />

          {/* Ruta dinámica para listar empleados por sede */}
          <Route path="/employees/:sede" element={
            <PrivateRoute>
              <ProtectedRoute module="employees">
                <EmployeesList />
              </ProtectedRoute>
            </PrivateRoute>
          } />

          {/* Ruta para ver lista de asistencias */}
          <Route path="/attendance-list" element={
            <PrivateRoute>
              <ProtectedRoute module="attendance">
                <AttendanceList />
              </ProtectedRoute>
            </PrivateRoute>
          } />

          {/* Ruta para lista de solicitudes */}
          <Route path="/requests" element={
            <PrivateRoute>
              <ProtectedRoute module="requests">
                <RequestsList />
              </ProtectedRoute>
            </PrivateRoute>
          } />

          {/* Ruta para calendario de solicitudes */}
          <Route path="/calendar" element={
            <PrivateRoute>
              <ProtectedRoute module="calendar">
                <CalendarRequests />
              </ProtectedRoute>
            </PrivateRoute>
          } />

          {/* Ruta para gestión de roles */}
          <Route path="/roles" element={
            <PrivateRoute>
              <ProtectedRoute module="settings">
                <RolesManagement />
              </ProtectedRoute>
            </PrivateRoute>
          } />

          {/* Ruta para gestión de cargos */}
          <Route path="/positions" element={
            <PrivateRoute>
              <ProtectedRoute module="settings">
                <PositionsManagement />
              </ProtectedRoute>
            </PrivateRoute>
          } />

          {/* Ruta para ver Papeleta de Vacaciones */}
          <Route path="/papeleta/:id" element={
            <PrivateRoute>
              <ProtectedRoute module="requests">
                <PapeletaVacaciones />
              </ProtectedRoute>
            </PrivateRoute>
          } />

          {/* Redirigir cualquier otra ruta a home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
