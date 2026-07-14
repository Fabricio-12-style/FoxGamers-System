export const posState = {
  carrito: [],
  productosBase: [],
  descuentosVigentes: [],
  pagosMixtos: [],
  clienteSeleccionado: null,
  esClienteNuevo: false,
  datosEmpresaGlobal: null,
  usuarioActivo: null,

  init(usuarioString) {
    this.usuarioActivo = JSON.parse(usuarioString || "{}");
  },
  setMaestros(productos, descuentos, empresa) {
    this.productosBase = productos.filter((p) => p.Activo);
    this.descuentosVigentes = Array.isArray(descuentos) ? descuentos : [];
    this.datosEmpresaGlobal = empresa;
  },

  buscarDescuento(productoID, categoriaID) {
    return (
      this.descuentosVigentes.find(
        (d) => d.AplicaA === "PRODUCTO" && d.ReferenciaID === productoID,
      ) ||
      this.descuentosVigentes.find(
        (d) => d.AplicaA === "CATEGORIA" && d.ReferenciaID === categoriaID,
      ) ||
      this.descuentosVigentes.find((d) => d.AplicaA === "GENERAL") ||
      null
    );
  },

  calcularMontoDescuento(descuento, precio, cantidad) {
    if (!descuento) return 0;
    const monto =
      descuento.TipoDescuento === "PORCENTAJE"
        ? precio * cantidad * (descuento.Valor / 100)
        : Math.min(descuento.Valor, precio * cantidad);
    return Math.round(monto * 100) / 100;
  },

  limpiarCaja() {
    this.carrito = [];
    this.clienteSeleccionado = null;
    this.esClienteNuevo = false;
    this.pagosMixtos = [];
  },
};