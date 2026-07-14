const clienteService = require("../services/clienteService");

const getClientes = async (req, res) => {
  try {
    const data = await clienteService.listar(req.query.q);
    res.json(data);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al listar clientes." });
  }
};

const buscarCliente = async (req, res) => {
  try {
    const data = await clienteService.buscarLigeroPOS(req.query.q);
    res.json(data);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al buscar cliente." });
  }
};

const consultarDocumento = async (req, res) => {
  try {
    const data = await clienteService.consultarDocumento(
      req.params.tipo,
      req.params.documento,
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const createCliente = async (req, res) => {
  try {
    await clienteService.crearCliente(req.body);
    res.json({ success: true, mensaje: "Cliente creado con éxito." });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const updateCliente = async (req, res) => {
  try {
    await clienteService.actualizarCliente(req.params.id, req.body);
    res.json({
      success: true,
      mensaje: "Ficha del cliente actualizada correctamente.",
    });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const cambiarEstadoCliente = async (req, res) => {
  try {
    await clienteService.alternarEstado(req.params.id, req.body.nuevoEstado);
    res.json({ success: true, mensaje: "Estado operativo actualizado." });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        mensaje: "Error de servidor al cambiar estado.",
      });
  }
};

const deleteCliente = async (req, res) => {
  try {
    await clienteService.eliminarCliente(req.params.id);
    res.json({ success: true, mensaje: "Cliente borrado permanentemente." });
  } catch (error) {
    const isConstraint = error.message.includes("historial de ventas");
    if (isConstraint)
      return res.json({ success: false, mensaje: error.message });
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

module.exports = {
  getClientes,
  buscarCliente,
  consultarDocumento,
  createCliente,
  updateCliente,
  cambiarEstadoCliente,
  deleteCliente,
};