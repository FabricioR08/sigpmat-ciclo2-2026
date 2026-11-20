import { useEffect, useState } from 'react';
import { CalendarClock, Plus, Pencil, Trash2, Filter, X } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const TIPOS = [
  { valor: 'disponible', etiqueta: 'Disponible', badge: 'bg-emerald-100 text-emerald-800' },
  { valor: 'preferente', etiqueta: 'Preferente', badge: 'bg-blue-100 text-blue-800' },
  { valor: 'no disponible', etiqueta: 'No disponible', badge: 'bg-rose-100 text-rose-800' },
];

const FORM_INICIAL = {
  id_empleado: '',
  dia_semana: 'lunes',
  hora_inicio: '07:00',
  hora_fin: '15:00',
  tipo_disponibilidad: 'disponible',
};

export default function Disponibilidad() {
  const { usuario } = useAuth();
  const rol = (usuario?.rol || '').toLowerCase().trim();
  const esPersonalMedico = rol === 'personal médico';

  const [registros, setRegistros] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [filtros, setFiltros] = useState({
    id_empleado: '',
    dia_semana: '',
    tipo_disponibilidad: '',
  });

  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState(null);

  const cargarDisponibilidades = async (filtrosActivos = filtros) => {
    setCargando(true);
    setError('');
    try {
      const params = {};
      if (!esPersonalMedico && filtrosActivos.id_empleado) {
        params.id_empleado = filtrosActivos.id_empleado;
      }
      if (filtrosActivos.dia_semana) params.dia_semana = filtrosActivos.dia_semana;
      if (filtrosActivos.tipo_disponibilidad) {
        params.tipo_disponibilidad = filtrosActivos.tipo_disponibilidad;
      }

      const { data } = await axiosClient.get('/disponibilidades', { params });
      setRegistros(data);
    } catch (err) {
      const msgs = err.response?.data?.errores || [err.response?.data?.error || 'Error al cargar disponibilidades.'];
      setError(msgs.join(' '));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDisponibilidades();
    if (!esPersonalMedico) {
      axiosClient
        .get('/empleados', { params: { estado: 'activo', limite: 200 } })
        .then(({ data }) => {
          const lista = Array.isArray(data) ? data : data.empleados || [];
          setEmpleados(lista);
        })
        .catch(() => {});
    }
  }, [esPersonalMedico]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    setGuardando(true);

    try {
      const payload = {
        dia_semana: form.dia_semana,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        tipo_disponibilidad: form.tipo_disponibilidad,
      };
      if (!esPersonalMedico && !editandoId) {
        payload.id_empleado = Number(form.id_empleado);
      }

      if (editandoId) {
        await axiosClient.put(`/disponibilidades/${editandoId}`, payload);
        setMensaje('Disponibilidad actualizada correctamente.');
      } else {
        await axiosClient.post('/disponibilidades', payload);
        setMensaje('Franja de disponibilidad registrada correctamente.');
      }

      setForm(FORM_INICIAL);
      setEditandoId(null);
      await cargarDisponibilidades();
    } catch (err) {
      const msgs = err.response?.data?.errores || [err.response?.data?.error || 'No se pudo guardar la disponibilidad.'];
      setError(msgs.join(' '));
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (item) => {
    setError('');
    setMensaje('');
    setEditandoId(item.id_disponibilidad);
    setForm({
      id_empleado: String(item.id_empleado),
      dia_semana: item.dia_semana,
      hora_inicio: item.hora_inicio,
      hora_fin: item.hora_fin,
      tipo_disponibilidad: item.tipo_disponibilidad,
    });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setForm(FORM_INICIAL);
    setError('');
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Desea eliminar esta franja de disponibilidad?')) return;
    setError('');
    setMensaje('');
    try {
      await axiosClient.delete(`/disponibilidades/${id}`);
      if (editandoId === id) cancelarEdicion();
      setMensaje('Franja eliminada correctamente.');
      await cargarDisponibilidades();
    } catch (err) {
      const msgs = err.response?.data?.errores || [err.response?.data?.error || 'Error al eliminar el registro.'];
      setError(msgs.join(' '));
    }
  };

  const obtenerBadge = (tipo) => {
    const encontrado = TIPOS.find((t) => t.valor === tipo);
    return encontrado || { etiqueta: tipo, badge: 'bg-slate-100 text-slate-700' };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-blue-600" />
            Disponibilidad del Personal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro y consulta de franjas horarias semanales por médico o personal asistencial.
          </p>
        </div>
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          {registros.length} franjas registradas
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}
      {mensaje && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {mensaje}
        </div>
      )}

      {/* Formulario de registro / edición */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            {editandoId ? 'Editar franja de disponibilidad' : 'Registrar nueva franja'}
          </h2>
          {editandoId && (
            <button
              type="button"
              onClick={cancelarEdicion}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" /> Cancelar edición
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {!esPersonalMedico && (
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Empleado</label>
              <select
                required
                disabled={Boolean(editandoId)}
                value={form.id_empleado}
                onChange={(e) => setForm({ ...form, id_empleado: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white disabled:bg-slate-100"
              >
                <option value="">Seleccione un empleado...</option>
                {empleados.map((emp) => (
                  <option key={emp.id_empleado} value={emp.id_empleado}>
                    {emp.codigo_empleado} - {emp.nombres} {emp.apellidos}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Día de la semana</label>
            <select
              value={form.dia_semana}
              onChange={(e) => setForm({ ...form, dia_semana: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white capitalize"
            >
              {DIAS.map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Hora inicio</label>
            <input
              type="time"
              required
              value={form.hora_inicio}
              onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Hora fin</label>
            <input
              type="time"
              required
              value={form.hora_fin}
              onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className={esPersonalMedico ? 'md:col-span-2' : ''}>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
            <select
              value={form.tipo_disponibilidad}
              onChange={(e) => setForm({ ...form, tipo_disponibilidad: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {guardando ? 'Guardando...' : editandoId ? 'Actualizar franja' : 'Agregar franja'}
          </button>
        </div>
      </form>

      {/* Filtros y tabla */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-end gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mr-2">
            <Filter className="w-4 h-4 text-slate-500" />
            Filtros:
          </div>

          {!esPersonalMedico && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Empleado</label>
              <select
                value={filtros.id_empleado}
                onChange={(e) => {
                  const nuevos = { ...filtros, id_empleado: e.target.value };
                  setFiltros(nuevos);
                  cargarDisponibilidades(nuevos);
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white"
              >
                <option value="">Todos</option>
                {empleados.map((emp) => (
                  <option key={emp.id_empleado} value={emp.id_empleado}>
                    {emp.nombres} {emp.apellidos}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-1">Día</label>
            <select
              value={filtros.dia_semana}
              onChange={(e) => {
                const nuevos = { ...filtros, dia_semana: e.target.value };
                setFiltros(nuevos);
                cargarDisponibilidades(nuevos);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white capitalize"
            >
              <option value="">Todos</option>
              {DIAS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo</label>
            <select
              value={filtros.tipo_disponibilidad}
              onChange={(e) => {
                const nuevos = { ...filtros, tipo_disponibilidad: e.target.value };
                setFiltros(nuevos);
                cargarDisponibilidades(nuevos);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white"
            >
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>

        {cargando ? (
          <p className="text-sm text-slate-500 py-6 text-center">Cargando disponibilidades...</p>
        ) : registros.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            No hay registros de disponibilidad con los filtros seleccionados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-3">Personal</th>
                  <th className="py-3 px-3">Día</th>
                  <th className="py-3 px-3">Horario</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {registros.map((item) => {
                  const badge = obtenerBadge(item.tipo_disponibilidad);
                  return (
                    <tr key={item.id_disponibilidad} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-600">
                        {item.codigo_empleado}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{item.empleado}</td>
                      <td className="py-2.5 px-3 capitalize">{item.dia_semana}</td>
                      <td className="py-2.5 px-3">
                        {item.hora_inicio} - {item.hora_fin}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.badge}`}>
                          {badge.etiqueta}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminar(item.id_disponibilidad)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-rose-200 text-xs text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}