const { horasEnSemana } = require('../conflictos.service');

class MenorCargaStrategy {
  constructor() {
    this.nombre = 'menor_carga';
  }

  /**
   * Calcula métricas semanales de carga para un candidato y ordena de menor a mayor carga.
   * @param {object} params
   * @param {object} params.turno
   * @param {Array<object>} params.candidatos - Cada item debe incluir { empleado, asignacionesVigentes }
   */
  ordenar({ turno, candidatos }) {
    const evaluados = candidatos.map((item) => {
      const horasSemanales = horasEnSemana(turno.fecha_turno, item.asignacionesVigentes || []);
      const turnosSemanales = (item.asignacionesVigentes || []).length;
      return {
        ...item,
        horasSemanales,
        turnosSemanales,
      };
    });

    evaluados.sort((a, b) => {
      if (a.horasSemanales !== b.horasSemanales) {
        return a.horasSemanales - b.horasSemanales;
      }
      if (a.turnosSemanales !== b.turnosSemanales) {
        return a.turnosSemanales - b.turnosSemanales;
      }
      return a.empleado.id_empleado - b.empleado.id_empleado;
    });

    return evaluados;
  }
}

module.exports = MenorCargaStrategy;