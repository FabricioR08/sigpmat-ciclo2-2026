import { useEffect, useState } from 'react';
import { History, RefreshCw, Search, X, Check, Ban } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

const ESTADOS = ['programado', 'confirmado', 'cancelado', 'cambiado'];
const BADGE = {
  programado: 'bg-blue-100 text-blue-800',
  confirmado: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-rose-100 text-rose-800',
  cambiado: 'bg-amber-100 text-amber-800',
};
const FILTROS_VACIOS = { estado: '', desde: '', hasta: '' };

function extraerMensajeError(err, fallback) {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (Array.isArray(data.motivos) && data.motivos.length > 0) {
    return data.motivos.map((m) => m.mensaje).join(' · ');
  }
  if (typeof data.error === 'string') return data.error;
  if (Array.isArray(data.errores) && data.errores.length > 0) return data.errores.join(' · ');
  return fallback;
}

const fecha = (v) => (v ? String(v).slice(0, 10) : '—');
const hora = (v) => (v ? String(v).slice(0, 5) : '');

export default function HistorialTurnos() {
  const { usuario } = useAuth();
  const rol = (usuario?.rol || '').toLowerCase().trim();
  const esPersonalMedico = rol === 'personal médico';

  const [asignaciones, setAsignaciones] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = async (filtrosActivos = filtros) => {
    setCargando(true);
    setError('');
    try {
      const params = {};
      Object.entries(filtrosActivos).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      // El personal médico solo ve su propio horario
      const ruta = esPersonalMedico ? '/asignaciones/mias' : '/asignaciones';
      const { data } = await axiosClient.get(ruta, { params });
      setAsignaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo cargar el historial de turnos.'));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const buscar = (e) => {
    e.preventDefault();
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      setError('La fecha "desde" no puede ser posterior a la fecha "hasta".');
      return;
    }
    cargar(filtros);
  };

  const limpiar = () => {
    setFiltros(FILTROS_VACIOS);
    cargar(FILTROS_VACIOS);
  };

  const cambiarEstado = async (asig, accion) => {
    setError('');
    setMensaje('');
    if (accion === 'cancelar' && !window.confirm('¿Cancelar esta asignación de turno?')) return;
    try {
      await axiosClient.patch(`/asignaciones/${asig.id_asignacion}/${accion}`);
      setMensaje(accion === 'confirmar' ? 'Asignación confirmada.' : 'Asignación cancelada.');
      await cargar();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo actualizar la asignación.'));
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg';
  const columnas = esPersonalMedico ? 7 : 9;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Historial de Turnos</h1>
          <p className="text-sm text-slate-500 mt-1">
            {esPersonalMedico
              ? 'Consulta de tus turnos asignados.'
              : 'Consulta y gestión de las asignaciones de turnos del personal.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => cargar()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}
      {mensaje && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {mensaje}
        </div>
      )}

      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <History className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800">Asignaciones</h2>
        </div>

        <form onSubmit={buscar} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
            <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              className={`${inputCls} bg-white`}>
              <option value="">Todos</option>
              {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Desde</label>
            <input type="date" value={filtros.desde}
              onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Hasta</label>
            <input type="date" value={filtros.hasta}
              onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition cursor-pointer">
              <Search className="w-4 h-4" /><span>Filtrar</span>
            </button>
            <button type="button" onClick={limpiar}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer">
              <X className="w-4 h-4" /><span>Limpiar</span>
            </button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Turno</th>
                <th className="py-2.5 px-3">Horario</th>
                <th className="py-2.5 px-3">Departamento</th>
                {!esPersonalMedico && <th className="py-2.5 px-3">Empleado</th>}
                <th className="py-2.5 px-3">Horas</th>
                <th className="py-2.5 px-3">Origen</th>
                <th className="py-2.5 px-3">Estado</th>
                {!esPersonalMedico && <th className="py-2.5 px-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {asignaciones.map((a) => (
                <tr key={a.id_asignacion} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-slate-600">{fecha(a.fecha_turno)}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{a.nombre_turno}</td>
                  <td className="py-2.5 px-3 text-slate-600">{hora(a.hora_inicio)} – {hora(a.hora_fin)}</td>
                  <td className="py-2.5 px-3 text-slate-600">{a.departamento || '—'}</td>
                  {!esPersonalMedico && <td className="py-2.5 px-3 text-slate-600">{a.empleado}</td>}
                  <td className="py-2.5 px-3 text-slate-600">{a.horas_programadas} h</td>
                  <td className="py-2.5 px-3 text-slate-600">{a.origen_asignacion}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${BADGE[a.estado_asignacion] || 'bg-slate-200 text-slate-600'}`}>
                      {a.estado_asignacion}
                    </span>
                  </td>
                  {!esPersonalMedico && (
                    <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                      {a.estado_asignacion === 'programado' && (
                        <button type="button" onClick={() => cambiarEstado(a, 'confirmar')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded cursor-pointer">
                          <Check className="w-3.5 h-3.5" /><span>Confirmar</span>
                        </button>
                      )}
                      {['programado', 'confirmado'].includes(a.estado_asignacion) && (
                        <button type="button" onClick={() => cambiarEstado(a, 'cancelar')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded cursor-pointer">
                          <Ban className="w-3.5 h-3.5" /><span>Cancelar</span>
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {!cargando && asignaciones.length === 0 && (
                <tr>
                  <td colSpan={columnas} className="py-4 px-3 text-center text-slate-500">
                    No hay asignaciones para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
