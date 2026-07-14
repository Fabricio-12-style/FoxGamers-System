export const empresaState = {
  datosEmpresaCache: null,
  enModoEdicion: false,

  setDatos(datos) {
    this.datosEmpresaCache = datos;
  },

  getDatos() {
    return this.datosEmpresaCache;
  },

  setModoEdicion(estado) {
    this.enModoEdicion = estado;
  },

  isModoEdicion() {
    return this.enModoEdicion;
  },
};