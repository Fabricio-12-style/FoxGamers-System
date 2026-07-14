// Archivo: frontend/modules/categorias/categoriasState.js

export const categoriasState = {
  listaCategoriasGlobal: [],
  categoriaEditandoId: null,

  setCategorias(categorias) {
    this.listaCategoriasGlobal = categorias || [];
  },

  getCategoriaById(id) {
    return this.listaCategoriasGlobal.find((c) => c.CategoriaID === id);
  },

  setEditandoId(id) {
    this.categoriaEditandoId = id;
  },

  getEditandoId() {
    return this.categoriaEditandoId;
  },

  limpiarEdicion() {
    this.categoriaEditandoId = null;
  },
};