const categoriasService = require("../services/categoriasService");

const getCategorias = async (req, res) => {
  try {
    const data = await categoriasService.listar(req.query.q);
    res.json(data);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al obtener categorías." });
  }
};

const createCategoria = async (req, res) => {
  try {
    await categoriasService.crearCategoria(req.body);
    res.json({ success: true, mensaje: "Categoría agregada correctamente." });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const updateCategoria = async (req, res) => {
  try {
    await categoriasService.actualizarCategoria(req.params.id, req.body);
    res.json({
      success: true,
      mensaje: "Categoría actualizada correctamente.",
    });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const cambiarEstadoCategoria = async (req, res) => {
  try {
    await categoriasService.alternarEstado(req.params.id, req.body.nuevoEstado);
    res.json({ success: true, mensaje: "Estado de categoría actualizado." });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: "Error de servidor al cambiar estado.",
    });
  }
};

const deleteCategoria = async (req, res) => {
  try {
    await categoriasService.eliminarCategoria(req.params.id);
    res.json({
      success: true,
      mensaje: "Categoría eliminada de la base de datos.",
    });
  } catch (error) {
    const isConstraint = error.message.includes("productos asociados");
    res
      .status(isConstraint ? 400 : 500)
      .json({ success: false, mensaje: error.message });
  }
};

const getCategoriasActivas = async (req, res) => {
  try {
    const { getConnection } = require("../config/db");
    const pool = await getConnection();
    const result = await pool.request().query(`
            SELECT CategoriaID, Nombre 
            FROM Categoria 
            WHERE Activo = 1 
            ORDER BY Nombre ASC
        `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error en getCategoriasActivas:", error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al cargar familias activas." });
  }
};

module.exports = {
  getCategorias,
  createCategoria,
  updateCategoria,
  cambiarEstadoCategoria,
  deleteCategoria,
  getCategoriasActivas,
};
