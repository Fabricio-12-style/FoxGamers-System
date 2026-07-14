export const inventarioState = {
  listaInventarioGlobal: [],
  usuarioActualID: null,

  init(usuarioString) {
    if (usuarioString) {
      const user = JSON.parse(usuarioString);
      this.usuarioActualID = user.UsuarioID || user.id;
    }
  },

  setInventario(lista) {
    this.listaInventarioGlobal = lista || [];
  },
  getInventario() {
    return this.listaInventarioGlobal;
  },
  getProductoById(id) {
    return this.listaInventarioGlobal.find((p) => p.ProductoID === id);
  },
  getUsuarioID() {
    return this.usuarioActualID;
  },
};