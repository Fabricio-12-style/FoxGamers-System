const { getConnection, sql } = require("../config/db");
const bcrypt = require("bcryptjs"); 
const login = async (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !usuario.trim() || !password) {
    return res
      .status(400)
      .json({ success: false, mensaje: "Debe ingresar usuario y contraseña." });
  }

  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("NombreUsuario", sql.VarChar, usuario.trim()).query(`
                SELECT 
                    u.UsuarioID, u.NombreUsuario, u.NombreCompleto, u.Contrasena, u.PerfilID, 
                    p.Nombre as Rol, u.Activo AS UsuarioActivo, p.Activo AS PerfilActivo,
                    u.IntentosFallidos,
                    CASE 
                        WHEN u.BloqueadoHasta IS NOT NULL AND u.BloqueadoHasta > GETDATE() 
                        THEN DATEDIFF(MINUTE, GETDATE(), u.BloqueadoHasta) 
                        ELSE 0 
                    END AS MinutosRestantes
                FROM Usuario u
                INNER JOIN Perfil p ON u.PerfilID = p.PerfilID
                WHERE u.NombreUsuario = @NombreUsuario
            `);
    if (result.recordset.length === 0) {
      return res
        .status(401)
        .json({ success: false, mensaje: "Usuario o contraseña incorrectos." });
    }

    const user = result.recordset[0];

    // --- VALIDACIONES DE BLOQUEO TEMPORAL ---
    if (user.MinutosRestantes > 0) {
      return res.status(403).json({
        success: false,
        mensaje: `Cuenta bloqueada por seguridad. Intente en ${user.MinutosRestantes} min.`,
      });
    }

    // // --- EL PUENTE DE ENCRIPTACIÓN ---
    const passwordValido = await bcrypt.compare(password, user.Contrasena);

    if (!passwordValido) {
      let nuevosIntentos = (user.IntentosFallidos || 0) + 1;
      await pool
        .request()
        .input("UsuarioID", sql.Int, user.UsuarioID)
        .input("Intentos", sql.Int, nuevosIntentos >= 4 ? 4 : nuevosIntentos)
        .query(`UPDATE Usuario SET IntentosFallidos = @Intentos, 
                        BloqueadoHasta = CASE WHEN @Intentos >= 4 THEN DATEADD(MINUTE, 15, GETDATE()) ELSE NULL END 
                        WHERE UsuarioID = @UsuarioID`);

      return res.status(401).json({
        success: false,
        mensaje:
          nuevosIntentos >= 4
            ? "Cuenta bloqueada por 15 min."
            : `Credenciales incorrectas. Le quedan ${4 - nuevosIntentos} intentos.`,
      });
    }

    // --- VALIDACIÓN DE ESTADO OPERATIVO ---
    if (!user.UsuarioActivo || !user.PerfilActivo) {
      return res.status(401).json({
        success: false,
        mensaje: "Su cuenta o perfil asignado se encuentra deshabilitado.",
      });
    }

    // --- CARGA DE PERMISOS DINÁMICOS ---
    const permisosRes = await pool
      .request()
      .input("PerfilID", sql.Int, user.PerfilID)
      .query(
        "SELECT ModuloNombre FROM ModuloPerfil WHERE PerfilID = @PerfilID AND TieneAcceso = 1",
      );

    const listaPermisos = permisosRes.recordset.map((p) => p.ModuloNombre);
    await pool
      .request()
      .input("UsuarioID", sql.Int, user.UsuarioID)
      .query(
        `UPDATE Usuario SET IntentosFallidos = 0, BloqueadoHasta = NULL, UltimoAcceso = GETDATE() WHERE UsuarioID = @UsuarioID`,
      );
    res.json({
      success: true,
      mensaje: `Bienvenido al sistema, ${user.NombreCompleto}`,
      user: {
        id: user.UsuarioID,
        Nombre: user.NombreCompleto,
        Rol: user.Rol,
        permisos: listaPermisos,
      },
    });
  } catch (error) {
    console.error("Error crítico en Login:", error);
    res.status(500).json({
      success: false,
      mensaje: "Error interno del servidor. Contacte a soporte.",
    });
  }
};

module.exports = { login };
