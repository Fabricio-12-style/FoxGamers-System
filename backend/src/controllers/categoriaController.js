const { getConnection, sql } = require("../config/db");

const regexBasura = /([a-zA-Z0-9])\1\1/;
const regexNombre = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-&]+$/;

// =======================================================
// 1. LISTAR CATEGORÍAS (OPTIMIZADO TOP-5 / BÚSQUEDA)
// =======================================================
const getCategorias = async (req, res) => {
  const { q } = req.query;
  try {
    const pool = await getConnection();
    const request = pool.request();
    let query = "";

    if (q && q.trim() !== "") {
      request.input("search", sql.VarChar, `%${q.trim()}%`);
      query = `
        SELECT CategoriaID, Nombre, Descripcion, Activo 
        FROM Categoria 
        WHERE Nombre LIKE @search
        ORDER BY Nombre ASC
      `;
    } else {
      query = `
        SELECT TOP 5 CategoriaID, Nombre, Descripcion, Activo 
        FROM Categoria 
        ORDER BY CategoriaID DESC
      `;
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al listar categorías." });
  }
};

// =======================================================
// 2. CREAR NUEVA CATEGORÍA
// =======================================================
const createCategoria = async (req, res) => {
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

// =======================================================
// 3. ACTUALIZAR CATEGORÍA
// =======================================================
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

// =======================================================
// 4. CAMBIAR ESTADO DE VISIBILIDAD (ACTIVAR/SUSPENDER)
// =======================================================
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

// =======================================================
// 5. ELIMINAR CATEGORÍA FÍSICAMENTE
// =======================================================
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