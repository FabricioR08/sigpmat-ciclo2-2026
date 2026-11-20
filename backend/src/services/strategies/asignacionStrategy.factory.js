const MenorCargaStrategy = require('./menorCarga.strategy');

const ESTRATEGIAS = {
  menor_carga: () => new MenorCargaStrategy(),
  equitativa: () => new MenorCargaStrategy(),
};

function obtenerEstrategia(nombre = 'menor_carga') {
  const clave = String(nombre || 'menor_carga').toLowerCase().trim();
  const crear = ESTRATEGIAS[clave];
  if (!crear) {
    const error = new Error(`Estrategia de asignación no soportada: "${nombre}".`);
    error.statusCode = 400;
    throw error;
  }
  return crear();
}

module.exports = { obtenerEstrategia };