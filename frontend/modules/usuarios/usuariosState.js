export const usuariosState = {
  listaUsuariosGlobal: [],
  usuarioEditandoId: null,
  miPropioID: null,

  init(usuarioString) {
    if (usuarioString) {
      const user = JSON.parse(usuarioString);
      this.miPropioID = user.UsuarioID || user.id;
    }
  },
  setUsuarios(usuarios) {
    this.listaUsuariosGlobal = usuarios || [];
  },
  getUsuarios() {
    return this.listaUsuariosGlobal;
  },
  getUsuarioById(id) {
    return this.listaUsuariosGlobal.find((u) => u.UsuarioID === id);
  },
  setEditandoId(id) {
    this.usuarioEditandoId = id;
  },
  getEditandoId() {
    return this.usuarioEditandoId;
  },
  getMiPropioID() {
    return this.miPropioID;
  },
};
