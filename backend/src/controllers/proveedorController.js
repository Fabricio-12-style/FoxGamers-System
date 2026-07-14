const proveedorService = require("../services/proveedorService");

const getProveedores = async (req, res) => {
  try {
    const data = await proveedorService.listar();
    res.json(data);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al listar los proveedores." });
  }
};

const createProveedor = async (req, res) => {
  try {
    await proveedorService.crearProveedor(req.body);
    res.json({ success: true, mensaje: "Proveedor agregado correctamente." });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const updateProveedor = async (req, res) => {
  try {
    await proveedorService.actualizarProveedor(req.params.id, req.body);
    res.json({
      success: true,
      mensaje: "Proveedor actualizado correctamente.",
    });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const cambiarEstadoProveedor = async (req, res) => {
  try {
    await proveedorService.alternarEstado(req.params.id, req.body.nuevoEstado);
    res.json({ success: true, mensaje: "Estado de proveedor actualizado." });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        mensaje: "Error de servidor al cambiar estado.",
      });
  }
};

const eliminarProveedor = async (req, res) => {
  try {
    await proveedorService.eliminarProveedor(req.params.id);
    res.json({
      success: true,
      mensaje: "Proveedor eliminado permanentemente.",
    });
  } catch (error) {
    const isConstraint = error.message.includes("vinculados");
    if (isConstraint)
      return res.json({ success: false, mensaje: error.message });

    res.status(500).json({ success: false, mensaje: error.message });
  }
};

const consultarRUC = async (req, res) => {
  try {
    const data = await proveedorService.consultarRUC(req.params.ruc);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

module.exports = {
  getProveedores,
  createProveedor,
  updateProveedor,
  cambiarEstadoProveedor,
  eliminarProveedor,
  consultarRUC,
};