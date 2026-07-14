export const productosState = {
  listaProductosGlobal: [],
  mapaCategorias: {},
  productoEditandoId: null,
  archivoImagen: null,
  imagenBase64: null,
  esAdmin: false,

  init(usuarioString) {
    const user = JSON.parse(usuarioString || "{}");
    this.esAdmin = (user.Rol || "").toUpperCase() === "ADMINISTRADOR";
  },

  setProductos(lista) {
    this.listaProductosGlobal = lista || [];
  },
  getProductos() {
    return this.listaProductosGlobal;
  },
  getProductoById(id) {
    return this.listaProductosGlobal.find((p) => p.ProductoID === id);
  },

  setCategorias(lista) {
    if (Array.isArray(lista)) {
      lista.forEach((c) => {
        this.mapaCategorias[c.CategoriaID] = c.Nombre;
      });
    }
  },
  getNombreCategoria(id) {
    return this.mapaCategorias[id] || "";
  },

  setEditandoId(id) {
    this.productoEditandoId = id;
  },
  getEditandoId() {
    return this.productoEditandoId;
  },

  setArchivoImagen(file) {
    this.archivoImagen = file;
  },
  getArchivoImagen() {
    return this.archivoImagen;
  },

  setImagenBase64(b64) {
    this.imagenBase64 = b64;
  },
  getImagenBase64() {
    return this.imagenBase64;
  },

  isAdmin() {
    return this.esAdmin;
  },
};
