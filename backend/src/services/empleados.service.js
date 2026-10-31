const empleados = require('../repositories/empleados.repository');

const TIPOS = ['médico', 'enfermero', 'especialista', 'administrativo'];
const ESTADOS = ['activo', 'suspendido', 'inactivo'];
const POR_PAGINA = 20; // RF-04: paginacion de 20 registros

async function listar(query) {
  const pagina = Math.max(parseInt(query.pagina, 10) || 1, 1);
  const { total, empleados: filas } = await empleados.listar({
    nombre: query.nombre, tipo: query.tipo, estado: query.estado,
    limite: POR_PAGINA, desplazamiento: (pagina - 1) * POR_PAGINA,
  });
  return { pagina, porPagina: POR_PAGINA, total, empleados: filas };
}

function validar(datos) {
  const errores = [];
  ['codigo_empleado', 'nombres', 'apellidos', 'tipo_empleado', 'fecha_ingreso'].forEach((campo) => {
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
  return errores;
}

async function crear(datos) {
  const errores = validar(datos);
  if (errores.length) return { ok: false, errores };
  return { ok: true, empleado: await empleados.crear(datos) };
}

module.exports = { listar, crear, validar };
