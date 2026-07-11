const jwt = require("jsonwebtoken");

// MIDDLEWARE 1: Valida que la petición tenga un token real y vigente
const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      mensaje:
        "Acceso denegado. No se detectó una sesión activa en el servidor.",
    });
  }

  try {
    const verificado = jwt.verify(
      token,
      process.env.JWT_SECRET || "ClaveSecretaInviolableFoxGamers2026",
    );
    req.usuario = verificado;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      mensaje:
        "Sesión inválida o caducada por inactividad. Vuelva a iniciar sesión.",
    });
  }
};

// MIDDLEWARE 2: Filtro de exclusividad para prevenir fraudes de vendedores
const soloAdministradores = (req, res, next) => {
  // Recordamos que el middleware anterior inyectó el objeto 'req.usuario'
  if (!req.usuario || req.usuario.rol.toLowerCase() !== "administrador") {
    return res.status(403).json({
      success: false,
      mensaje:
        "Infracción de privilegios. Esta acción es de uso exclusivo para Administradores.",
    });
  }
  next();
};

module.exports = { verificarToken, soloAdministradores };
