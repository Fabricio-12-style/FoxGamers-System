export const proveedoresState = {
  listaProveedoresGlobal: [],

  setProveedores(proveedores) {
    this.listaProveedoresGlobal = proveedores || [];
  },

  getProveedores() {
    return this.listaProveedoresGlobal;
  },

  getProveedorById(id) {
    return this.listaProveedoresGlobal.find((p) => p.ProveedorID === id);
  },
};
