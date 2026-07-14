const productoService = require("../services/productoService");
const repository = require("../repositories/productoRepository");

const getProductos = async (req, res) => {
  try {
    res.json(await repository.listar(req.query.q));
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al obtener la lista." });
  }
};

const createProducto = async (req, res) => {
  try {
    await productoService.crearProducto(req.body, req.file?.filename);
    res.json({ success: true, mensaje: "Producto creado y catalogado." });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const updateProducto = async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0)
    return res
      .status(400)
      .json({ success: false, mensaje: "Asegúrate de enviar FormData." });
  try {
    await productoService.actualizarProducto(
      req.params.id,
      req.body,
      req.file?.filename,
    );
    res.json({ success: true, mensaje: "Cambios guardados correctamente." });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const cambiarEstadoProducto = async (req, res) => {
  try {
    await repository.cambiarEstado(req.params.id, req.body.nuevoEstado);
    res.json({ success: true, mensaje: "Estado de visibilidad actualizado." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al cambiar estado." });
  }
};

const ajustarStock = async (req, res) => {
  try {
    await productoService.ajustarStock(req.body);
    res.json({
      success: true,
      mensaje: "Movimiento de stock procesado con éxito.",
    });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const deleteProducto = async (req, res) => {
  try {
    await productoService.eliminarProducto(req.params.id);
    res.json({ success: true, mensaje: "Producto eliminado definitivamente." });
  } catch (error) {
    const isConstraint = error.message.includes("Kardex");
    if (isConstraint)
      return res.json({ success: false, mensaje: error.message });
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

const getKardex = async (req, res) => {
  try {
    res.json(await repository.obtenerKardex(req.params.id));
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al consultar historial." });
  }
};

const getProductosPOS = async (req, res) => {
  try {
    res.json(await repository.listarPOS());
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al cargar catálogo POS." });
  }
};

const getProductosWebPublica = async (req, res) => {
  try {
    res.json(await repository.listarWeb());
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al cargar catálogo web." });
  }
};

module.exports = {
  getProductos,
  createProducto,
  updateProducto,
  getProductosPOS,
  cambiarEstadoProducto,
  ajustarStock,
  getKardex,
  deleteProducto,
  getProductosWebPublica,
};