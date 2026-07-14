export const clientesState = {
  listaClientesGlobal: [],
  clienteEditandoId: null,

  setClientes(clientes) {
    this.listaClientesGlobal = clientes || [];
  },

  getClienteById(id) {
    return this.listaClientesGlobal.find((c) => c.ClienteID === id);
  },

  setEditandoId(id) {
    this.clienteEditandoId = id;
  },

  getEditandoId() {
    return this.clienteEditandoId;
  },

  limpiarEdicion() {
    this.clienteEditandoId = null;
  },
};