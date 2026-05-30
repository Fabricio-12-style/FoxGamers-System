const { getConnection, sql } = require("../config/db");

// 1. Expresiones regulares para control de calidad
const regexBasura = /([a-zA-Z0-9])\1\1/;
const regexNombre = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-&]+$/;

// 2. Listar todas las categorías
const getCategorias = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
            SELECT CategoriaID, Nombre, Descripcion, Activo 
            FROM Categoria 
            ORDER BY Nombre ASC
        `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al listar categorías." });
  }
};

// 3. Crear nueva categoría
const createCategoria = async (req, res) => {
  const { Nombre, Descripcion } = req.body;

  // 4. Validaciones de entrada
  if (!Nombre || !Nombre.trim()) {
    return res
      .status(400)
      .json({ success: false, mensaje: "El nombre es obligatorio." });
  }

  const nombreLimpio = Nombre.trim();
  if (!regexNombre.test(nombreLimpio) || regexBasura.test(nombreLimpio)) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje: "Nombre inválido o contiene caracteres no permitidos.",
      });
  }

  try {
    const pool = await getConnection();

    // 5. Prevención de duplicados
    const existe = await pool
      .request()
      .input("Nombre", sql.VarChar, nombreLimpio)
      .query("SELECT CategoriaID FROM Categoria WHERE Nombre = @Nombre");

    if (existe.recordset.length > 0) {
      return res
        .status(400)
        .json({ success: false, mensaje: "La categoría ya existe." });
    }

    await pool
      .request()
      .input("Nombre", sql.VarChar, nombreLimpio)
      .input(
        "Descripcion",
        sql.VarChar,
        Descripcion ? Descripcion.trim() : null,
      )
      .query(
        "INSERT INTO Categoria (Nombre, Descripcion, Activo) VALUES (@Nombre, @Descripcion, 1)",
      );

    res.json({ success: true, mensaje: "Categoría creada correctamente." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al crear categoría." });
  }
};

// 6. Actualizar categoría
const updateCategoria = async (req, res) => {
  const { id } = req.params;
  const { Nombre, Descripcion } = req.body;

  if (!Nombre || !Nombre.trim()) {
    return res
      .status(400)
      .json({ success: false, mensaje: "El nombre es obligatorio." });
  }

  const nombreLimpio = Nombre.trim();
  if (!regexNombre.test(nombreLimpio) || regexBasura.test(nombreLimpio)) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje: "Nombre inválido o contiene caracteres no permitidos.",
      });
  }

  try {
    const pool = await getConnection();

    // 7. Evitar colisión de nombres con otras categorías existentes
    const existe = await pool
      .request()
      .input("Nombre", sql.VarChar, nombreLimpio)
      .input("ID", sql.Int, id)
      .query(
        "SELECT CategoriaID FROM Categoria WHERE Nombre = @Nombre AND CategoriaID != @ID",
      );

    if (existe.recordset.length > 0) {
      return res
        .status(400)
        .json({
          success: false,
          mensaje: "Ya existe otra categoría con ese nombre.",
        });
    }

    await pool
      .request()
      .input("ID", sql.Int, id)
      .input("Nombre", sql.VarChar, nombreLimpio)
      .input(
        "Descripcion",
        sql.VarChar,
        Descripcion ? Descripcion.trim() : null,
      )
      .query(
        "UPDATE Categoria SET Nombre = @Nombre, Descripcion = @Descripcion WHERE CategoriaID = @ID",
      );

    res.json({ success: true, mensaje: "Categoría actualizada." });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: "Error al actualizar." });
  }
};

// 8. Cambiar estado (Activar/Desactivar)
const cambiarEstadoCategoria = async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado } = req.body;
  try {
    const pool = await getConnection();
    await pool
      .request()
      .input("ID", sql.Int, id)
      .input("Estado", sql.Bit, nuevoEstado)
      .query("UPDATE Categoria SET Activo = @Estado WHERE CategoriaID = @ID");

    res.json({ success: true, mensaje: "Estado de categoría actualizado." });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: "Error de servidor." });
  }
};

// 9. Eliminar categoría físicamente
const deleteCategoria = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    await pool
      .request()
      .input("ID", sql.Int, id)
      .query("DELETE FROM Categoria WHERE CategoriaID = @ID");

    res.json({
      success: true,
      mensaje: "Categoría eliminada de la base de datos.",
    });
  } catch (error) {
    // 10. Captura de integridad referencial
    if (error.number === 547) {
      return res.status(400).json({
        success: false,
        mensaje:
          "No se puede eliminar: Esta familia tiene productos asociados. Prueba suspenderla.",
      });
    }
    res.status(500).json({ success: false, mensaje: "Error al eliminar." });
  }
};

module.exports = {
  getCategorias,
  createCategoria,
  updateCategoria,
  cambiarEstadoCategoria,
  deleteCategoria,
};