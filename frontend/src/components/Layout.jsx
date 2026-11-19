import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  CalendarRange,
  History,
  FileCheck2,
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MENU_ITEMS = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
    roles: ['administrador', 'jefe de área', 'personal médico'],
  },
  {
    label: 'Personal Médico',
    to: '/empleados',
    icon: Users,
    roles: ['administrador', 'jefe de área'],
  },
  {
    label: 'Departamentos y Especialidades',
    to: '/departamentos',
    icon: Building2,
    roles: ['administrador'],
  },
  {
    label: 'Jornadas y Disponibilidad',
    to: '/disponibilidad',
    icon: CalendarClock,
    roles: ['administrador', 'jefe de área', 'personal médico'],
  },
  {
    label: 'Programación de Turnos',
    to: '/turnos',
    icon: CalendarRange,
    roles: ['administrador', 'jefe de área'],
  },
  {
    label: 'Historial de Turnos',
    to: '/historial-turnos',
    icon: History,
    roles: ['administrador', 'jefe de área', 'personal médico'],
  },
  {
    label: 'Permisos y Vacaciones',
    to: '/permisos',
    icon: FileCheck2,
    roles: ['administrador', 'jefe de área', 'personal médico'],
  },
  {
    label: 'Cambios de Turno',
    to: '/cambios-turno',
    icon: ArrowLeftRight,
    roles: ['administrador', 'jefe de área', 'personal médico'],
  },
  {
    label: 'Reportes',
    to: '/reportes',
    icon: BarChart3,
    roles: ['administrador', 'jefe de área'],
  },
  {
    label: 'Auditoría',
    to: '/auditoria',
    icon: ClipboardList,
    roles: ['administrador'],
  },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const rolActual = (usuario?.rol || '').toLowerCase().trim();
  const itemsVisibles = MENU_ITEMS.filter((item) => item.roles.includes(rolActual));

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900">
      <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white tracking-wide">SIGPMAT</h2>
            <p className="text-xs text-slate-400 mt-1">
              Usuario: <span className="text-slate-200 font-medium">{usuario?.usuario}</span>
            </p>
            <p className="text-xs text-slate-400">
              Rol: <span className="text-blue-300 font-medium">{usuario?.rol}</span>
            </p>
          </div>

          <nav className="p-3 space-y-1">
            {itemsVisibles.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                      isActive
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-slate-800 hover:text-red-200 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}