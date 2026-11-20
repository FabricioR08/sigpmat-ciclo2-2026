import { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, RefreshCw, Search, X } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

const FORM_INICIAL = {
  codigo_empleado: '',
  nombres: '',
  apellidos: '',
  dui: '',
  telefono: '',
  correo: '',
  tipo_empleado: 'médico',
  estado_laboral: 'activo',
  fecha_ingreso: '',
  id_departamento: '',
  especialidades: [],
};

const BADGE_ESTADO = {
  activo: 'bg-emerald-100 text-emerald-700',
  suspendido: 'bg-amber-100 text-amber-800',
  inactivo: 'bg-slate-200 text-slate-600',
};

function extraerMensajeError(err, fallback) {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data.error === 'string') return data.error;
  if (Array.isArray(data.errores) && data.errores.length > 0) return data.errores.join(' · ');
  return fallback;
}

// Validaciones del lado del cliente (mismas reglas que el backend: DUI, correo y fecha)
function validarFormulario(f) {
  const errores = [];
  if (!f.codigo_empleado.trim()) errores.push('El código de empleado es obligatorio.');
  if (!f.nombres.trim()) errores.push('Los nombres son obligatorios.');
  if (!f.apellidos.trim()) errores.push('Los apellidos son obligatorios.');
  if (!f.fecha_ingreso) errores.push('La fecha de ingreso es obligatoria.');
  if (f.dui && !/^[0-9]{8}-[0-9]$/.test(f.dui)) errores.push('El DUI debe tener el formato 00000000-0.');
  if (f.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo)) errores.push('El correo no tiene un formato válido.');
  return errores;
}

export default function Empleados() {
  const { usuario } = useAuth();
  const esAdmin = (usuario?.rol || '').toLowerCase().trim() === 'administrador';

  const [empleados, setEmpleados] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(20);
  const [catalogos, setCatalogos] = useState({
    departamentos: [],
    especialidades: [],
    tipos_empleado: [],
    estados_laborales: [],
  });
  const [filtros, setFiltros] = useState({ nombre: '', tipo: '', estado: '', departamento: '' });

  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ofrecerInactivar, setOfrecerInactivar] = useState(null);

  const cargarEmpleados = async (filtrosActivos = filtros, paginaActiva = pagina) => {
    setCargando(true);
    try {
      const params = { pagina: paginaActiva };
      Object.entries(filtrosActivos).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const { data } = await axiosClient.get('/empleados', { params });
      setEmpleados(data.empleados || []);
      setTotal(data.total || 0);
      setPorPagina(data.porPagina || 20);
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo cargar el personal.'));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    axiosClient
      .get('/catalogos')
      .then(({ data }) => setCatalogos((c) => ({ ...c, ...data })))
      .catch((err) => setError(extraerMensajeError(err, 'No se pudieron cargar los catálogos.')));
    cargarEmpleados();
  }, []);

  const limpiarAlertas = () => {
    setError('');
    setMensaje('');
    setOfrecerInactivar(null);
  };

  const aplicarFiltros = (e) => {
    e.preventDefault();
    setPagina(1);
    cargarEmpleados(filtros, 1);
  };

  const limpiarFiltros = () => {
    const vacios = { nombre: '', tipo: '', estado: '', departamento: '' };
    setFiltros(vacios);
    setPagina(1);
    cargarEmpleados(vacios, 1);
  };

  const irAPagina = (p) => {
    setPagina(p);
    cargarEmpleados(filtros, p);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setForm(FORM_INICIAL);
  };

  const toggleEspecialidad = (id) => {
    setForm((f) => ({
      ...f,
      especialidades: f.especialidades.includes(id)
        ? f.especialidades.filter((x) => x !== id)
        : [...f.especialidades, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    limpiarAlertas();

    const errores = validarFormulario(form);
    if (errores.length > 0) {
      setError(errores.join(' · '));
      return;
    }

    const payload = {
      codigo_empleado: form.codigo_empleado.trim(),
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      tipo_empleado: form.tipo_empleado,
      estado_laboral: form.estado_laboral,
      fecha_ingreso: form.fecha_ingreso,
      especialidades: form.especialidades,
      id_departamento: form.id_departamento ? Number(form.id_departamento) : null,
    };
    if (form.dui.trim()) payload.dui = form.dui.trim();
    if (form.telefono.trim()) payload.telefono = form.telefono.trim();
    if (form.correo.trim()) payload.correo = form.correo.trim();

    setGuardando(true);
    try {
      if (editandoId) {
        await axiosClient.put(`/empleados/${editandoId}`, payload);
        setMensaje('Empleado actualizado correctamente.');
      } else {
        await axiosClient.post('/empleados', payload);
        setMensaje('Empleado registrado correctamente.');
      }
      cancelarEdicion();
      await cargarEmpleados();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo guardar el empleado.'));
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = async (emp) => {
    limpiarAlertas();
    try {
      const { data } = await axiosClient.get(`/empleados/${emp.id_empleado}`);
      setEditandoId(data.id_empleado);
      setForm({
        codigo_empleado: data.codigo_empleado || '',
        nombres: data.nombres || '',
        apellidos: data.apellidos || '',
        dui: data.dui || '',
        telefono: data.telefono || '',
        correo: data.correo || '',
        tipo_empleado: data.tipo_empleado || 'médico',
        estado_laboral: data.estado_laboral || 'activo',
        fecha_ingreso: (data.fecha_ingreso || '').slice(0, 10),
        id_departamento: data.departamento?.id_departamento ?? '',
        especialidades: (data.especialidades || []).map((x) => x.id_especialidad),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo cargar el empleado.'));
    }
  };

  const eliminar = async (emp) => {
    limpiarAlertas();
    if (!window.confirm(`¿Eliminar a ${emp.nombres} ${emp.apellidos}? Esta acción no se puede deshacer.`)) return;
    try {
      await axiosClient.delete(`/empleados/${emp.id_empleado}`);
      setMensaje('Empleado eliminado.');
      await cargarEmpleados();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo eliminar el empleado.'));
      // 409: tiene turnos, permisos o solicitudes -> ofrecer inactivarlo
      if (err.response?.status === 409) setOfrecerInactivar(emp);
    }
  };

  const inactivar = async (emp) => {
    try {
      await axiosClient.put(`/empleados/${emp.id_empleado}`, { estado_laboral: 'inactivo' });
      limpiarAlertas();
      setMensaje(`${emp.nombres} ${emp.apellidos} fue marcado como inactivo.`);
      await cargarEmpleados();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo cambiar el estado.'));
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Personal Médico</h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro, búsqueda y actualización del personal del hospital.
          </p>
        </div>
        <button
          type="button"
          onClick={() => cargarEmpleados()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          {ofrecerInactivar && (
            <button
              type="button"
              onClick={() => inactivar(ofrecerInactivar)}
              className="shrink-0 px-3 py-1 text-xs bg-white border border-red-300 hover:bg-red-100 rounded cursor-pointer"
            >
              Marcar como inactivo
            </button>
          )}
        </div>
      )}
      {mensaje && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {mensaje}
        </div>
      )}

      {/* FORMULARIO */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar empleado' : 'Registrar empleado'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Código *</label>
            <input type="text" required value={form.codigo_empleado} placeholder="EMP-050"
              onChange={(e) => setForm({ ...form, codigo_empleado: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nombres *</label>
            <input type="text" required value={form.nombres}
              onChange={(e) => setForm({ ...form, nombres: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Apellidos *</label>
            <input type="text" required value={form.apellidos}
              onChange={(e) => setForm({ ...form, apellidos: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">DUI</label>
            <input type="text" value={form.dui} placeholder="00000000-0" maxLength={10}
              onChange={(e) => setForm({ ...form, dui: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono</label>
            <input type="text" value={form.telefono} placeholder="7000-0000"
              onChange={(e) => setForm({ ...form, telefono: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Correo</label>
            <input type="email" value={form.correo} placeholder="nombre@hospital.test"
              onChange={(e) => setForm({ ...form, correo: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de empleado *</label>
            <select value={form.tipo_empleado} onChange={(e) => setForm({ ...form, tipo_empleado: e.target.value })}
              className={`${inputCls} bg-white`}>
              {catalogos.tipos_empleado.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Estado laboral</label>
            <select value={form.estado_laboral} onChange={(e) => setForm({ ...form, estado_laboral: e.target.value })}
              className={`${inputCls} bg-white`}>
              {catalogos.estados_laborales.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Fecha de ingreso *</label>
            <input type="date" required value={form.fecha_ingreso}
              onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Departamento</label>
            <select value={form.id_departamento} onChange={(e) => setForm({ ...form, id_departamento: e.target.value })}
              className={`${inputCls} bg-white`}>
              <option value="">Sin departamento</option>
              {catalogos.departamentos.map((d) => (
                <option key={d.id_departamento} value={d.id_departamento}>{d.nombre}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Especialidades (la primera que marques es la principal)
            </label>
            <div className="flex flex-wrap gap-2">
              {catalogos.especialidades.map((esp) => {
                const marcada = form.especialidades.includes(esp.id_especialidad);
                const principal = form.especialidades[0] === esp.id_especialidad;
                return (
                  <button
                    type="button"
                    key={esp.id_especialidad}
                    onClick={() => toggleEspecialidad(esp.id_especialidad)}
                    className={`px-3 py-1 text-xs rounded-full border transition cursor-pointer ${
                      marcada
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {esp.nombre}{principal ? ' ★' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <button type="submit" disabled={guardando}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg transition cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>{editandoId ? 'Guardar cambios' : 'Registrar empleado'}</span>
            </button>
            {editandoId && (
              <button type="button" onClick={cancelarEdicion}
                className="px-3.5 py-2 text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition cursor-pointer">
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </section>

      {/* LISTADO */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <form onSubmit={aplicarFiltros} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Buscar por nombre</label>
            <input type="text" value={filtros.nombre} placeholder="Nombres o apellidos"
              onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
            <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
              className={`${inputCls} bg-white`}>
              <option value="">Todos</option>
              {catalogos.tipos_empleado.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
            <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              className={`${inputCls} bg-white`}>
              <option value="">Todos</option>
              {catalogos.estados_laborales.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Departamento</label>
            <select value={filtros.departamento} onChange={(e) => setFiltros({ ...filtros, departamento: e.target.value })}
              className={`${inputCls} bg-white`}>
              <option value="">Todos</option>
              {catalogos.departamentos.map((d) => (
                <option key={d.id_departamento} value={d.id_departamento}>{d.nombre}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-5 flex gap-2">
            <button type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition cursor-pointer">
              <Search className="w-4 h-4" /><span>Buscar</span>
            </button>
            <button type="button" onClick={limpiarFiltros}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer">
              <X className="w-4 h-4" /><span>Limpiar</span>
            </button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Nombre</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Departamento</th>
                <th className="py-2.5 px-3">Especialidad</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {empleados.map((emp) => (
                <tr key={emp.id_empleado} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-slate-600">{emp.codigo_empleado}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{emp.nombres} {emp.apellidos}</td>
                  <td className="py-2.5 px-3 text-slate-600">{emp.tipo_empleado}</td>
                  <td className="py-2.5 px-3 text-slate-600">{emp.departamento || '—'}</td>
                  <td className="py-2.5 px-3 text-slate-600">{emp.especialidad_principal || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${BADGE_ESTADO[emp.estado_laboral] || 'bg-slate-200 text-slate-600'}`}>
                      {emp.estado_laboral}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                    <button type="button" onClick={() => iniciarEdicion(emp)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" /><span>Editar</span>
                    </button>
                    {esAdmin && (
                      <button type="button" onClick={() => eliminar(emp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" /><span>Eliminar</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!cargando && empleados.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-4 px-3 text-center text-slate-500">
                    No se encontró personal con esos criterios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>{total} empleado(s) · Página {pagina} de {totalPaginas}</span>
          <div className="space-x-2">
            <button type="button" disabled={pagina <= 1} onClick={() => irAPagina(pagina - 1)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg cursor-pointer">
              Anterior
            </button>
            <button type="button" disabled={pagina >= totalPaginas} onClick={() => irAPagina(pagina + 1)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg cursor-pointer">
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
