const { getConnection, sql } = require("../config/db");

const ROLES_PERMITIDOS = [
  "Administrador",
  "Supervisor",
  "Vendedor",
  "Almacenero",
  "Soporte Tecnico",
];

const getPerfiles = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
            SELECT PerfilID, Nombre, Descripcion, Activo, FechaCreacion 
            FROM Perfil
        `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar los perfiles." });
  }
};

// // 1. Activar / Desactivar Perfil
const toggleBlockPerfil = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  if (parseInt(id) === 1) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje: "El perfil Administrador no puede ser desactivado.",
      });
  }

  try {
    const pool = await getConnection();
    await pool
      .request()
      .input("PerfilID", sql.Int, id)
      .input("Estado", sql.Bit, estado)
      .query("UPDATE Perfil SET Activo = @Estado WHERE PerfilID = @PerfilID");
    res.json({
      success: true,
      mensaje: estado ? "Perfil activado." : "Perfil desactivado.",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al cambiar estado." });
  }
};

// // 2. Eliminar Perfil
const deletePerfil = async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === 1) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje: "El perfil Administrador es vital y no puede ser eliminado.",
      });
  }

  try {
    const pool = await getConnection();
    await pool
      .request()
      .input("PerfilID", sql.Int, id)
      .query("DELETE FROM Perfil WHERE PerfilID = @PerfilID");

    res.json({
      success: true,
      mensaje: "Perfil eliminado permanentemente de la base de datos.",
    });
  } catch (error) {
    if (error.number === 547) {
      return res.status(400).json({
        success: false,
        mensaje:
          "No se puede eliminar: Existen usuarios vinculados a este perfil. Primero cámbialos de rol o elimínalos.",
      });
    }
    console.error("Error al eliminar perfil:", error);
    res
      .status(500)
      .json({
        success: false,
        mensaje: "Error interno al intentar eliminar el perfil.",
      });
  }
};

// // 3. Editar Perfil
const updatePerfil = async (req, res) => {
  const { id } = req.params;
  const { Nombre, Descripcion } = req.body;

  if (parseInt(id) === 1) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje: "El perfil Administrador no puede ser modificado.",
      });
  }

  if (!Nombre || !Nombre.trim()) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje: "El nombre del perfil es obligatorio.",
      });
  }
  if (!ROLES_PERMITIDOS.includes(Nombre.trim())) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje:
          "La designación del rol no pertenece a la estructura comercial autorizada.",
      });
  }

  if (!Descripcion || Descripcion.trim().length < 10) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje:
          "La descripción analítica es obligatoria (Mínimo 10 caracteres).",
      });
  }

  try {
    const pool = await getConnection();
    await pool
      .request()
      .input("PerfilID", sql.Int, id)
      .input("Nombre", sql.VarChar, Nombre.trim())
      .input("Descripcion", sql.VarChar, Descripcion.trim()).query(`
                UPDATE Perfil 
                SET Nombre = @Nombre, Descripcion = @Descripcion 
                WHERE PerfilID = @PerfilID
            `);
    res.json({ success: true, mensaje: "Perfil actualizado." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al actualizar perfil." });
  }
};

const getPermisosPerfil = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("PerfilID", sql.Int, id)
      .query(
        "SELECT ModuloNombre FROM ModuloPerfil WHERE PerfilID = @PerfilID AND TieneAcceso = 1",
      );

    const permisos = result.recordset.map((r) => r.ModuloNombre);
    res.json(permisos);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener permisos." });
  }
};

// // 4. Guardar Permisos del Modal
const guardarPermisosPerfil = async (req, res) => {
  const { perfilId, modulos } = req.body;
  if (!perfilId || !Array.isArray(modulos)) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje: "Estructura de datos para permisos inválida.",
      });
  }

  if (parseInt(perfilId) === 1 && !modulos.includes("configuracionWeb")) {
    modulos.push("configuracionWeb");
  }

  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction
        .request()
        .input("id", sql.Int, perfilId)
        .query("UPDATE ModuloPerfil SET TieneAcceso = 0 WHERE PerfilID = @id");

      for (const mod of modulos) {
        if (!mod || !mod.trim()) continue;

        await transaction
          .request()
          .input("id", sql.Int, perfilId)
          .input("mod", sql.VarChar, mod.trim()).query(`
                        IF EXISTS (SELECT 1 FROM ModuloPerfil WHERE PerfilID = @id AND ModuloNombre = @mod)
                            UPDATE ModuloPerfil SET TieneAcceso = 1 WHERE PerfilID = @id AND ModuloNombre = @mod
                        ELSE
                            INSERT INTO ModuloPerfil (PerfilID, ModuloNombre, TieneAcceso) VALUES (@id, @mod, 1)
                    `);
      }

      await transaction.commit();
      res.json({ success: true, mensaje: "Permisos actualizados con éxito." });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al guardar permisos." });
  }
};

// // 5. Crear Perfil
const createPerfil = async (req, res) => {
  const { Nombre, Descripcion } = req.body;
  if (!Nombre || !Nombre.trim()) {
    return res
      .status(400)
      .json({ success: false, mensaje: "El nombre del perfil es requerido." });
  }
  if (!ROLES_PERMITIDOS.includes(Nombre.trim())) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje: "Designación de rol comercial inválida o no autorizada.",
      });
  }

  if (!Descripcion || Descripcion.trim().length < 10) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje:
          "La descripción analítica de funciones es obligatoria (Mínimo 10 caracteres).",
      });
  }

  try {
    const pool = await getConnection();

    const existe = await pool
      .request()
      .input("Nombre", sql.VarChar, Nombre.trim())
      .query("SELECT PerfilID FROM Perfil WHERE Nombre = @Nombre");

    if (existe.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        mensaje:
          "Ya existe un perfil con ese nombre en los registros del almacén.",
      });
    }

    await pool
      .request()
      .input("Nombre", sql.VarChar, Nombre.trim())
      .input("Descripcion", sql.VarChar, Descripcion.trim()).query(`
                INSERT INTO Perfil (Nombre, Descripcion, Activo, FechaCreacion)
                VALUES (@Nombre, @Descripcion, 1, GETDATE())
            `);

    res.json({ success: true, mensaje: "Perfil registrado correctamente." });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al registrar perfil." });
  }
};

module.exports = {
  getPerfiles,
  toggleBlockPerfil,
  deletePerfil,
  updatePerfil,
  getPermisosPerfil,
  guardarPermisosPerfil,
  createPerfil,
};