const empleados = require('../repositories/empleados.repository');

const TIPOS = ['médico', 'enfermero', 'especialista', 'administrativo'];
const ESTADOS = ['activo', 'suspendido', 'inactivo'];
const POR_PAGINA = 20; // RF-04: paginación de 20 registros
const OBLIGATORIOS = ['codigo_empleado', 'nombres', 'apellidos', 'tipo_empleado', 'fecha_ingreso'];

function entero(valor) {
  const n = parseInt(valor, 10);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

async function listar(query) {
  const pagina = Math.max(parseInt(query.pagina, 10) || 1, 1);
  const { total, empleados: filas } = await empleados.listar({
    nombre: query.nombre ? String(query.nombre).trim() : undefined,
    tipo: query.tipo,
    estado: query.estado,
    departamento: entero(query.departamento),
    especialidad: entero(query.especialidad),
    limite: POR_PAGINA,
    desplazamiento: (pagina - 1) * POR_PAGINA,
  });
  return { pagina, porPagina: POR_PAGINA, total, empleados: filas };
}

/**
 * Valida los datos de un empleado. Con { parcial: true } (edicion) solo se revisan
 * los campos que vienen en la petición.
 */
function validar(datos, { parcial = false } = {}) {
  const errores = [];

  OBLIGATORIOS.forEach((campo) => {
    if (parcial && datos[campo] === undefined) return;
    if (!datos[campo] || !String(datos[campo]).trim()) errores.push(`El campo ${campo} es obligatorio.`);
  });
  if (datos.tipo_empleado && !TIPOS.includes(datos.tipo_empleado)) {
    errores.push(`tipo_empleado debe ser uno de: ${TIPOS.join(', ')}.`);
  }
  if (datos.estado_laboral && !ESTADOS.includes(datos.estado_laboral)) {
    errores.push(`estado_laboral debe ser uno de: ${ESTADOS.join(', ')}.`);
  }
  if (datos.dui && !/^[0-9]{8}-[0-9]$/.test(datos.dui)) {
    errores.push('El DUI debe tener el formato 00000000-0.');
  }
  if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) {
    errores.push('El correo no tiene un formato válido.');
  }
  if (datos.fecha_ingreso && !/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha_ingreso)) {
    errores.push('La fecha de ingreso debe tener el formato AAAA-MM-DD.');
  }
  if (datos.especialidades !== undefined
      && !(Array.isArray(datos.especialidades) && datos.especialidades.every((n) => Number.isInteger(n) && n > 0))) {
    errores.push('especialidades debe ser una lista de identificadores numéricos.');
  }
  if (datos.id_departamento !== undefined && datos.id_departamento !== null
      && !(Number.isInteger(datos.id_departamento) && datos.id_departamento > 0)) {
    errores.push('id_departamento debe ser un número entero (o null para quitarlo).');
  }
  return errores;
}

function separar(datos) {
  const campos = {};
  empleados.COLUMNAS_EDITABLES.forEach((c) => {
    if (datos[c] !== undefined) campos[c] = typeof datos[c] === 'string' ? datos[c].trim() : datos[c];
  });
  return {
    campos,
    extras: { especialidades: datos.especialidades, idDepartamento: datos.id_departamento },
  };
}

async function crear(datos) {
  const errores = validar(datos);
  if (errores.length) return { ok: false, codigo: 400, errores };
  const { campos, extras } = separar(datos);
  const id = await empleados.crear(campos, extras);
  return { ok: true, empleado: await empleados.obtenerDetalle(id) };
}

async function actualizar(id, datos) {
  const errores = validar(datos, { parcial: true });
  if (errores.length) return { ok: false, codigo: 400, errores };
  const { campos, extras } = separar(datos);
  if (!Object.keys(campos).length && extras.especialidades === undefined && extras.idDepartamento === undefined) {
    return { ok: false, codigo: 400, errores: ['No se envió ningún campo para actualizar.'] };
  }
  const existe = await empleados.actualizar(id, campos, extras);
  if (!existe) return { ok: false, codigo: 404, errores: ['El empleado no existe.'] };
  return { ok: true, empleado: await empleados.obtenerDetalle(id) };
}

async function eliminar(id) {
  try {
    const borrado = await empleados.eliminar(id);
    if (!borrado) return { ok: false, codigo: 404, errores: ['El empleado no existe.'] };
    return { ok: true };
  } catch (error) {
    if (error.code === '23503') {
      return {
        ok: false,
        codigo: 409,
        errores: ['No se puede eliminar: el empleado tiene turnos, permisos o solicitudes asociados. '
          + 'Cambie su estado laboral a "inactivo" en lugar de eliminarlo.'],
      };
    }
    throw error;
  }
}

module.exports = { TIPOS, ESTADOS, listar, validar, crear, actualizar, eliminar };
