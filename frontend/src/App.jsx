import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Departamentos from './pages/Departamentos';
import Disponibilidad from './pages/Disponibilidad';
import Empleados from './pages/Empleados';
import HistorialTurnos from './pages/HistorialTurnos';
import NotificacionesAuditoria from './pages/NotificacionesAuditoria';

function RutaProtegida({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Dashboard() {
  const { usuario } = useAuth();
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-800">Panel Principal</h1>
      <p className="text-slate-600 mt-2">
        Sesión activa como <strong>{usuario?.usuario}</strong> con rol{' '}
        <strong>{usuario?.rol}</strong>.
      </p>
    </div>
  );
}

function ModuloPendiente({ titulo }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">{titulo}</h2>
      <p className="text-sm text-slate-500 mt-1">
        Estructura base lista. Este módulo se completa en su etapa correspondiente.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RutaProtegida>
                <Layout />
              </RutaProtegida>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="departamentos" element={<Departamentos />} />
            <Route path="empleados" element={<Empleados />} />
            <Route path="disponibilidad" element={<Disponibilidad />} />
            <Route path="turnos" element={<ModuloPendiente titulo="Programación de Turnos" />} />
            <Route path="historial-turnos" element={<HistorialTurnos />} />
            <Route path="permisos" element={<ModuloPendiente titulo="Permisos y Vacaciones" />} />
            <Route path="cambios-turno" element={<ModuloPendiente titulo="Cambios de Turno" />} />
            <Route path="reportes" element={<ModuloPendiente titulo="Reportes" />} />
            <Route path="auditoria" element={<NotificacionesAuditoria />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}