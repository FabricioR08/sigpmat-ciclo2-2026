const { validar } = require('../src/services/empleados.service');

const valido = {
  codigo_empleado: 'EMP-100', nombres: 'Rosa', apellidos: 'Mena', dui: '07890123-4',
  correo: 'rosa@hospital.test', tipo_empleado: 'médico', fecha_ingreso: '2026-10-28',
};

describe('RF-03: validación de empleados al crear', () => {
  test('datos completos y correctos no producen errores', () => {
    expect(validar(valido)).toEqual([]);
  });
  test('rechaza campos obligatorios vacíos', () => {
    const errores = validar({ ...valido, nombres: '  ', codigo_empleado: undefined });
    expect(errores).toHaveLength(2);
  });
  test('rechaza un DUI con formato inválido', () => {
    expect(validar({ ...valido, dui: '123' })).toContain('El DUI debe tener el formato 00000000-0.');
  });
  test('rechaza un tipo de empleado inexistente', () => {
    expect(validar({ ...valido, tipo_empleado: 'conserje' })).toHaveLength(1);
  });
  test('rechaza una fecha con formato incorrecto', () => {
    expect(validar({ ...valido, fecha_ingreso: '28/10/2026' })).toHaveLength(1);
  });
  test('rechaza especialidades que no son una lista de números', () => {
    expect(validar({ ...valido, especialidades: ['a'] })).toHaveLength(1);
  });
});

describe('Edición parcial de empleados', () => {
  test('solo valida los campos que se envían', () => {
    expect(validar({ telefono: '7000-0000' }, { parcial: true })).toEqual([]);
  });
  test('un campo enviado vacío sigue siendo inválido', () => {
    expect(validar({ nombres: '' }, { parcial: true })).toHaveLength(1);
  });
  test('valida el formato de los campos enviados', () => {
    expect(validar({ dui: 'abc' }, { parcial: true })).toHaveLength(1);
  });
});
