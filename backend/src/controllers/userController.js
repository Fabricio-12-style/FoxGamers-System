const { getConnection, sql } = require("../config/db");
const bcrypt = require("bcryptjs");

// // Expresiones Regulares Centralizadas
const regexPwdFuerte =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&._-]{8,}$/;
const regexBasura = /([a-zA-Z0-9])\1\1/;

// // 1. Listar Usuarios
const getUsers = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
            SELECT 
                UsuarioID, 
                NombreCompleto AS Nombre, 
                NombreUsuario AS Usuario, 
                Correo,
                CASE 
                    WHEN PerfilID = 1 THEN 'Administrador'
                    WHEN PerfilID = 2 THEN 'Supervisor'
                    WHEN PerfilID = 3 THEN 'Vendedor'
                    ELSE 'Vendedor'
                END AS Perfil,
                Activo 
            FROM Usuario 
        `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    res.status(500).json({ mensaje: "Error al listar usuarios." });
  }
};

// // 2. Crear Usuario (Con Hashing y Filtros Estrictos)
const createUser = async (req, res) => {
  const { Nombre, Usuario, Password, Rol } = req.body;

  if (!Nombre || !Usuario || !Password) {
    return res
      .status(400)
      .json({ success: false, mensaje: "Todos los campos son obligatorios." });
  }

  if (regexBasura.test(Nombre.trim()) || regexBasura.test(Usuario.trim())) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje:
          "El sistema ha bloqueado el registro por detección de texto ilógico o repetitivo.",
      });
  }

  if (!regexPwdFuerte.test(Password.trim())) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje:
          "La contraseña es muy débil. Requiere mayúscula, minúscula, número y 8 caracteres mínimos.",
      });
  }

  let perfilId = 3;
  if (Rol === "ADMINISTRADOR") perfilId = 1;
  else if (Rol === "SUPERVISOR") perfilId = 2;

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(Password.trim(), salt);

    const pool = await getConnection();

    const existe = await pool
      .request()
      .input("NombreUsuario", sql.VarChar, Usuario.trim())
      .query(
        "SELECT UsuarioID FROM Usuario WHERE NombreUsuario = @NombreUsuario",
      );

    if (existe.recordset.length > 0) {
      return res
        .status(400)
        .json({
          success: false,
          mensaje: "El nombre de usuario ya está registrado en el sistema.",
        });
    }

    await pool
      .request()
      .input("PerfilID", sql.Int, perfilId)
      .input("NombreUsuario", sql.VarChar, Usuario.trim())
      .input("Contrasena", sql.VarChar, passwordHash)
      .input("NombreCompleto", sql.VarChar, Nombre.trim())
      .input("Correo", sql.VarChar, `${Usuario.trim()}@foxgamers.com`).query(`
                INSERT INTO Usuario (PerfilID, NombreUsuario, Contrasena, NombreCompleto, Correo, Activo, FechaCreacion, UltimoAcceso)
                VALUES (@PerfilID, @NombreUsuario, @Contrasena, @NombreCompleto, @Correo, 1, GETDATE(), GETDATE())
            `);

    res.json({
      success: true,
      mensaje: "Usuario creado correctamente y credenciales encriptadas.",
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res
      .status(500)
      .json({
        success: false,
        mensaje: "Error interno del servidor al registrar el usuario.",
      });
  }
};

// // 3. Bloquear / Desbloquear
const toggleBlockUser = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (parseInt(id) === 1) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje: "La cuenta raíz del sistema no puede ser bloqueada.",
      });
  }

  try {
    const pool = await getConnection();
    await pool
      .request()
      .input("UsuarioID", sql.Int, id)
      .input("Estado", sql.Bit, estado)
      .query(
        "UPDATE Usuario SET Activo = @Estado WHERE UsuarioID = @UsuarioID",
      );

    res.json({
      success: true,
      mensaje: estado
        ? "Acceso desbloqueado."
        : "Acceso bloqueado temporalmente.",
    });
  } catch (error) {
    console.error("Error al cambiar estado:", error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al cambiar estado operativo." });
  }
};

// // 4. Eliminar definitivamente
const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === 1) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje:
          "Infracción de seguridad: La cuenta raíz no puede ser eliminada.",
      });
  }

  try {
    const pool = await getConnection();
    await pool
      .request()
      .input("UsuarioID", sql.Int, id)
      .query("DELETE FROM Usuario WHERE UsuarioID = @UsuarioID");

    res.json({
      success: true,
      mensaje: "Perfil de usuario eliminado permanentemente.",
    });
  } catch (error) {
    if (error.number === 547) {
      return res
        .status(400)
        .json({
          success: false,
          mensaje:
            "Existen registros vinculados a este usuario. Inactívelo en lugar de eliminarlo.",
        });
    }
    console.error("Error al eliminar:", error);
    res
      .status(500)
      .json({
        success: false,
        mensaje: "Error al eliminar el usuario de la base de datos.",
      });
  }
};

// // 5. Editar Usuario (Con soporte para Hashing Dinámico)
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { Nombre, Usuario, Password, Correo, Rol } = req.body;

  if (!Nombre || !Usuario || !Correo) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje: "Los datos principales no pueden quedar vacíos.",
      });
  }

  if (regexBasura.test(Nombre.trim()) || regexBasura.test(Usuario.trim())) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje: "Actualización bloqueada por detección de texto incoherente.",
      });
  }

  let perfilId = 3;
  if (Rol === "ADMINISTRADOR" || parseInt(id) === 1) perfilId = 1;
  else if (Rol === "SUPERVISOR") perfilId = 2;

  try {
    const pool = await getConnection();
    const request = pool
      .request()
      .input("UsuarioID", sql.Int, id)
      .input("PerfilID", sql.Int, perfilId)
      .input("NombreUsuario", sql.VarChar, Usuario.trim())
      .input("NombreCompleto", sql.VarChar, Nombre.trim())
      .input("Correo", sql.VarChar, Correo.trim());

    let queryText = "";

    if (!Password || Password.trim() === "") {
      queryText = `
                UPDATE Usuario 
                SET PerfilID = @PerfilID, 
                    NombreUsuario = @NombreUsuario, 
                    NombreCompleto = @NombreCompleto, 
                    Correo = @Correo 
                WHERE UsuarioID = @UsuarioID
            `;
    } else {
      if (!regexPwdFuerte.test(Password.trim())) {
        return res
          .status(400)
          .json({
            success: false,
            mensaje:
              "La nueva contraseña es débil. Requiere mayúscula, minúscula, número y 8 caracteres.",
          });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(Password.trim(), salt);

      request.input("Contrasena", sql.VarChar, passwordHash);
      queryText = `
                UPDATE Usuario 
                SET PerfilID = @PerfilID, 
                    NombreUsuario = @NombreUsuario, 
                    Contrasena = @Contrasena, 
                    NombreCompleto = @NombreCompleto, 
                    Correo = @Correo 
                WHERE UsuarioID = @UsuarioID
            `;
    }

    await request.query(queryText);
    res.json({
      success: true,
      mensaje: "Usuario actualizado de manera segura.",
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res
      .status(500)
      .json({
        success: false,
        mensaje: "Error crítico al actualizar en la base de datos.",
      });
  }
};

module.exports = {
  getUsers,
  createUser,
  toggleBlockUser,
  deleteUser,
  updateUser,
};