import { useEffect, useState } from 'react';
import { Building2, Stethoscope, Plus, Pencil, RefreshCw } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const FORM_DEPTO_INICIAL = {
  nombre: '',
  tipo_area: '',
  ubicacion: '',
  capacidad_minima_dia: 1,
  capacidad_minima_noche: 1,
  estado: true,
};

const FORM_ESP_INICIAL = {
  nombre: '',
  descripcion: '',
  estado: true,
};

function esActivo(valor) {
  return valor === true || valor === 'activo' || valor === 'true';
}

function extraerMensajeError(err, fallback) {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data.error === 'string') return data.error;
  if (Array.isArray(data.errores) && data.errores.length > 0) {
    return data.errores.join(' · ');
  }
  return fallback;
}

export default function Departamentos() {
  const [departamentos, setDepartamentos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [formDepto, setFormDepto] = useState(FORM_DEPTO_INICIAL);
  const [editandoDeptoId, setEditandoDeptoId] = useState(null);
  const [guardandoDepto, setGuardandoDepto] = useState(false);

  const [formEsp, setFormEsp] = useState(FORM_ESP_INICIAL);
  const [editandoEspId, setEditandoEspId] = useState(null);
  const [guardandoEsp, setGuardandoEsp] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    setError('');
    try {
      const [resDeptos, resEsp] = await Promise.all([
        axiosClient.get('/departamentos'),
        axiosClient.get('/especialidades'),
      ]);

      const listaDeptos = Array.isArray(resDeptos.data)
        ? resDeptos.data
        : resDeptos.data?.departamentos || [];
      const listaEsp = Array.isArray(resEsp.data)
        ? resEsp.data
        : resEsp.data?.especialidades || [];

      setDepartamentos(listaDeptos);
      setEspecialidades(listaEsp);
    } catch (err) {
      setError(
        extraerMensajeError(
          err,
          'No se pudieron cargar departamentos y especialidades.'
        )
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const limpiarAlertas = () => {
    setError('');
    setMensaje('');
  };

  // --- DEPARTAMENTOS ---
  const handleSubmitDepto = async (e) => {
    e.preventDefault();
    limpiarAlertas();
    setGuardandoDepto(true);

    const payload = {
      nombre: formDepto.nombre.trim(),
      tipo_area: formDepto.tipo_area.trim(),
      ubicacion: formDepto.ubicacion.trim(),
      capacidad_minima_dia: Number(formDepto.capacidad_minima_dia) || 0,
      capacidad_minima_noche: Number(formDepto.capacidad_minima_noche) || 0,
      estado: Boolean(formDepto.estado),
    };

    try {
      if (editandoDeptoId) {
        await axiosClient.put(`/departamentos/${editandoDeptoId}`, payload);
        setMensaje('Departamento actualizado correctamente.');
      } else {
        await axiosClient.post('/departamentos', payload);
        setMensaje('Departamento creado correctamente.');
      }
      setFormDepto(FORM_DEPTO_INICIAL);
      setEditandoDeptoId(null);
      await cargarDatos();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo guardar el departamento.'));
    } finally {
      setGuardandoDepto(false);
    }
  };

  const iniciarEdicionDepto = (depto) => {
    limpiarAlertas();
    const id = depto.id_departamento ?? depto.id;
    setEditandoDeptoId(id);
    setFormDepto({
      nombre: depto.nombre || '',
      tipo_area: depto.tipo_area || '',
      ubicacion: depto.ubicacion || '',
      capacidad_minima_dia: depto.capacidad_minima_dia ?? 1,
      capacidad_minima_noche: depto.capacidad_minima_noche ?? 1,
      estado: esActivo(depto.estado),
    });
  };

  const toggleEstadoDepto = async (depto) => {
    limpiarAlertas();
    const id = depto.id_departamento ?? depto.id;
    const actualActivo = esActivo(depto.estado);
    const nuevoEstado = !actualActivo;
    try {
      await axiosClient.patch(`/departamentos/${id}/estado`, { estado: nuevoEstado });
      setMensaje(
        `Departamento marcado como ${nuevoEstado ? 'activo' : 'inactivo'}.`
      );
      await cargarDatos();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo cambiar el estado del departamento.'));
    }
  };

  // --- ESPECIALIDADES ---
  const handleSubmitEsp = async (e) => {
    e.preventDefault();
    limpiarAlertas();
    setGuardandoEsp(true);

    const payload = {
      nombre: formEsp.nombre.trim(),
      descripcion: formEsp.descripcion.trim(),
      estado: Boolean(formEsp.estado),
    };

    try {
      if (editandoEspId) {
        await axiosClient.put(`/especialidades/${editandoEspId}`, payload);
        setMensaje('Especialidad actualizada correctamente.');
      } else {
        await axiosClient.post('/especialidades', payload);
        setMensaje('Especialidad creada correctamente.');
      }
      setFormEsp(FORM_ESP_INICIAL);
      setEditandoEspId(null);
      await cargarDatos();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo guardar la especialidad.'));
    } finally {
      setGuardandoEsp(false);
    }
  };

  const iniciarEdicionEsp = (esp) => {
    limpiarAlertas();
    const id = esp.id_especialidad ?? esp.id;
    setEditandoEspId(id);
    setFormEsp({
      nombre: esp.nombre || '',
      descripcion: esp.descripcion || '',
      estado: esActivo(esp.estado),
    });
  };

  const toggleEstadoEsp = async (esp) => {
    limpiarAlertas();
    const id = esp.id_especialidad ?? esp.id;
    const actualActivo = esActivo(esp.estado);
    const nuevoEstado = !actualActivo;
    try {
      await axiosClient.patch(`/especialidades/${id}/estado`, { estado: nuevoEstado });
      setMensaje(
        `Especialidad marcada como ${nuevoEstado ? 'activa' : 'inactiva'}.`
      );
      await cargarDatos();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo cambiar el estado de la especialidad.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Departamentos y Especialidades</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestión de áreas hospitalarias y especialidades médicas del catálogo.
          </p>
        </div>
        <button
          type="button"
          onClick={cargarDatos}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {mensaje}
        </div>
      )}

      {/* SECCIÓN DEPARTAMENTOS */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800">Departamentos</h2>
        </div>

        <form onSubmit={handleSubmitDepto} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              type="text"
              required
              value={formDepto.nombre}
              onChange={(e) => setFormDepto({ ...formDepto, nombre: e.target.value })}
              placeholder="Ej. Cirugía General"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de área *</label>
            <input
              type="text"
              required
              value={formDepto.tipo_area}
              onChange={(e) => setFormDepto({ ...formDepto, tipo_area: e.target.value })}
              placeholder="Ej. hospitalización / emergencia"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Ubicación</label>
            <input
              type="text"
              value={formDepto.ubicacion}
              onChange={(e) => setFormDepto({ ...formDepto, ubicacion: e.target.value })}
              placeholder="Ej. Edificio B, 2do nivel"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Capacidad mínima día *</label>
            <input
              type="number"
              min="0"
              required
              value={formDepto.capacidad_minima_dia}
              onChange={(e) => setFormDepto({ ...formDepto, capacidad_minima_dia: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Capacidad mínima noche *</label>
            <input
              type="number"
              min="0"
              required
              value={formDepto.capacidad_minima_noche}
              onChange={(e) => setFormDepto({ ...formDepto, capacidad_minima_noche: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
            <select
              value={formDepto.estado ? 'true' : 'false'}
              onChange={(e) =>
                setFormDepto({ ...formDepto, estado: e.target.value === 'true' })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={guardandoDepto}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{editandoDeptoId ? 'Guardar cambios' : 'Agregar departamento'}</span>
            </button>

            {editandoDeptoId && (
              <button
                type="button"
                onClick={() => {
                  setEditandoDeptoId(null);
                  setFormDepto(FORM_DEPTO_INICIAL);
                }}
                className="px-3.5 py-2 text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition cursor-pointer"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                <th className="py-2.5 px-3">Nombre</th>
                <th className="py-2.5 px-3">Tipo de área</th>
                <th className="py-2.5 px-3">Ubicación</th>
                <th className="py-2.5 px-3">Cap. Día/Noche</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departamentos.map((depto) => {
                const id = depto.id_departamento ?? depto.id;
                const activo = esActivo(depto.estado);
                return (
                  <tr key={id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{depto.nombre}</td>
                    <td className="py-2.5 px-3 text-slate-600">{depto.tipo_area}</td>
                    <td className="py-2.5 px-3 text-slate-600">{depto.ubicacion || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {depto.capacidad_minima_dia} / {depto.capacidad_minima_noche}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activo
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => iniciarEdicionDepto(depto)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleEstadoDepto(depto)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded cursor-pointer"
                      >
                        <span>{activo ? 'Desactivar' : 'Activar'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!cargando && departamentos.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-4 px-3 text-center text-slate-500">
                    No hay departamentos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECCIÓN ESPECIALIDADES */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Stethoscope className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800">Especialidades</h2>
        </div>

        <form onSubmit={handleSubmitEsp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              type="text"
              required
              value={formEsp.nombre}
              onChange={(e) => setFormEsp({ ...formEsp, nombre: e.target.value })}
              placeholder="Ej. Cardiología"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
            <input
              type="text"
              value={formEsp.descripcion}
              onChange={(e) => setFormEsp({ ...formEsp, descripcion: e.target.value })}
              placeholder="Descripción breve de la especialidad"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
            <select
              value={formEsp.estado ? 'true' : 'false'}
              onChange={(e) =>
                setFormEsp({ ...formEsp, estado: e.target.value === 'true' })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={guardandoEsp}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{editandoEspId ? 'Guardar cambios' : 'Agregar especialidad'}</span>
            </button>

            {editandoEspId && (
              <button
                type="button"
                onClick={() => {
                  setEditandoEspId(null);
                  setFormEsp(FORM_ESP_INICIAL);
                }}
                className="px-3.5 py-2 text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition cursor-pointer"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                <th className="py-2.5 px-3">Nombre</th>
                <th className="py-2.5 px-3">Descripción</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {especialidades.map((esp) => {
                const id = esp.id_especialidad ?? esp.id;
                const activa = esActivo(esp.estado);
                return (
                  <tr key={id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{esp.nombre}</td>
                    <td className="py-2.5 px-3 text-slate-600">{esp.descripcion || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activa
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => iniciarEdicionEsp(esp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleEstadoEsp(esp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded cursor-pointer"
                      >
                        <span>{activa ? 'Desactivar' : 'Activar'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!cargando && especialidades.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-4 px-3 text-center text-slate-500">
                    No hay especialidades registradas.
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