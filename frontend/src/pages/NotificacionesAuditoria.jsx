import { useEffect, useState } from 'react';
import { Bell, ClipboardList, CheckCheck, Search, RefreshCw } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function NotificacionesAuditoria() {
  const { usuario } = useAuth();
  const rol = (usuario?.rol || '').toLowerCase().trim();
  const puedeVerAuditoria = rol === 'administrador' || rol === 'jefe de área';

  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [cargandoNotif, setCargandoNotif] = useState(true);

  const [auditoriaRows, setAuditoriaRows] = useState([]);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(puedeVerAuditoria);
  const [filtrosAud, setFiltrosAud] = useState({
    accion: '',
    tabla: '',
    desde: '',
    hasta: '',
  });

  const [error, setError] = useState('');

  const cargarNotificaciones = async (filtrarNoLeidas = soloNoLeidas) => {
    setCargandoNotif(true);
    try {
      const { data } = await axiosClient.get('/notificaciones', {
        params: filtrarNoLeidas ? { no_leidas: 'true' } : {},
      });
      setNotificaciones(data.notificaciones || []);
      setNoLeidas(data.noLeidas ?? 0);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar las notificaciones.');
    } finally {
      setCargandoNotif(false);
    }
  };

  const cargarAuditoria = async (filtros = filtrosAud) => {
    if (!puedeVerAuditoria) return;
    setCargandoAuditoria(true);
    try {
      const params = {};
      if (filtros.accion.trim()) params.accion = filtros.accion.trim();
      if (filtros.tabla.trim()) params.tabla = filtros.tabla.trim();
      if (filtros.desde) params.desde = filtros.desde;
      if (filtros.hasta) params.hasta = filtros.hasta;

      const { data } = await axiosClient.get('/auditoria', { params });
      setAuditoriaRows(Array.isArray(data) ? data : []);
    } catch (err) {
      const msgs = err.response?.data?.errores || [err.response?.data?.error || 'No se pudo cargar la bitácora de auditoría.'];
      setError(msgs.join(' '));
    } finally {
      setCargandoAuditoria(false);
    }
  };

  useEffect(() => {
    cargarNotificaciones();
    cargarAuditoria();
  }, [puedeVerAuditoria]);

  const marcarLeida = async (id) => {
    try {
      await axiosClient.patch(`/notificaciones/${id}/leer`);
      await cargarNotificaciones();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar la notificación.');
    }
  };

  const marcarTodas = async () => {
    try {
      await axiosClient.patch('/notificaciones/leer-todas');
      await cargarNotificaciones();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron marcar las notificaciones.');
    }
  };

  const buscarAuditoria = (e) => {
    e.preventDefault();
    setError('');
    cargarAuditoria(filtrosAud);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Notificaciones y Auditoría</h1>
          <p className="text-sm text-slate-500 mt-1">
            Avisos del sistema para tu usuario y bitácora de acciones registradas.
          </p>
        </div>
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          {noLeidas} sin leer
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Sección de Notificaciones */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Notificaciones del usuario
          </h2>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={soloNoLeidas}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSoloNoLeidas(checked);
                  cargarNotificaciones(checked);
                }}
                className="rounded border-slate-300"
              />
              Solo no leídas
            </label>

            <button
              type="button"
              onClick={marcarTodas}
              disabled={noLeidas === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como leídas
            </button>
          </div>
        </div>

        {cargandoNotif ? (
          <p className="text-sm text-slate-500 py-4 text-center">Cargando notificaciones...</p>
        ) : notificaciones.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No hay notificaciones para mostrar.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {notificaciones.map((n) => (
              <li
                key={n.id_notificacion}
                className={`py-3 px-3 rounded-lg flex items-start justify-between gap-4 ${
                  n.leida ? 'bg-white' : 'bg-blue-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">{n.titulo}</span>
                    {!n.leida && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Nueva
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{n.mensaje}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.fecha_envio).toLocaleString()}
                  </p>
                </div>

                {!n.leida && (
                  <button
                    type="button"
                    onClick={() => marcarLeida(n.id_notificacion)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0 cursor-pointer"
                  >
                    Marcar leída
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Sección de Auditoría del Sistema */}
      {puedeVerAuditoria && (
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              Bitácora de Auditoría
            </h2>
            <button
              type="button"
              onClick={() => cargarAuditoria(filtrosAud)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Actualizar
            </button>
          </div>

          <form onSubmit={buscarAuditoria} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Acción</label>
              <input
                type="text"
                placeholder="Ej. login, asignar_turno"
                value={filtrosAud.accion}
                onChange={(e) => setFiltrosAud({ ...filtrosAud, accion: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Tabla afectada</label>
              <input
                type="text"
                placeholder="Ej. usuarios, asignaciones_turno"
                value={filtrosAud.tabla}
                onChange={(e) => setFiltrosAud({ ...filtrosAud, tabla: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Desde</label>
              <input
                type="date"
                value={filtrosAud.desde}
                onChange={(e) => setFiltrosAud({ ...filtrosAud, desde: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Hasta</label>
              <input
                type="date"
                value={filtrosAud.hasta}
                onChange={(e) => setFiltrosAud({ ...filtrosAud, hasta: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 cursor-pointer"
              >
                <Search className="w-4 h-4" /> Filtrar
              </button>
            </div>
          </form>

          {cargandoAuditoria ? (
            <p className="text-sm text-slate-500 py-4 text-center">Cargando registros de auditoría...</p>
          ) : auditoriaRows.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No hay registros en la bitácora con esos filtros.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Acción</th>
                    <th className="py-2.5 px-3">Tabla</th>
                    <th className="py-2.5 px-3">Registro</th>
                    <th className="py-2.5 px-3">IP</th>
                    <th className="py-2.5 px-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {auditoriaRows.map((row) => (
                    <tr key={row.id_auditoria} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-xs text-slate-500">{row.id_auditoria}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {row.usuario || `ID ${row.id_usuario}`}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-medium">
                          {row.accion}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-slate-600">{row.tabla_afectada}</td>
                      <td className="py-2 px-3 font-mono text-xs text-slate-600">{row.registro_afectado}</td>
                      <td className="py-2 px-3 font-mono text-xs text-slate-500">{row.ip_origen || '-'}</td>
                      <td className="py-2 px-3 text-xs text-slate-500">
                        {new Date(row.fecha_accion).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}