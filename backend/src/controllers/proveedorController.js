const { getConnection, sql } = require("../config/db");

// Expresiones Regulares de Seguridad
const regexRUC = /^\d{11}$/;
const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getProveedores = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
            SELECT ProveedorID, RazonSocial, RUC, Direccion, Telefono, Correo, Contacto, Activo, FechaCreacion
            FROM Proveedor
            ORDER BY ProveedorID DESC
        `);
    res.json(result.recordset);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al listar los proveedores." });
  }
};

const createProveedor = async (req, res) => {
  const { RazonSocial, RUC, Direccion, Telefono, Correo, Contacto } = req.body;

  if (!regexRUC.test(RUC))
    return res
      .status(400)
      .json({
        success: false,
        mensaje: "El RUC debe tener exactamente 11 números.",
      });
  if (Correo && Correo.trim() !== "" && !regexCorreo.test(Correo))
    return res
      .status(400)
      .json({ success: false, mensaje: "Formato de correo no válido." });

  try {
    const pool = await getConnection();
    const rucExistente = await pool
      .request()
      .input("RUC", sql.VarChar, RUC)
      .query("SELECT ProveedorID FROM Proveedor WHERE RUC = @RUC");

    if (rucExistente.recordset.length > 0) {
      return res
        .status(400)
        .json({
          success: false,
          mensaje: "Ya existe un proveedor registrado con este RUC.",
        });
    }

    await pool
      .request()
      .input("RazonSocial", sql.VarChar, RazonSocial)
      .input("RUC", sql.VarChar, RUC)
      .input("Direccion", sql.VarChar, Direccion || "")
      .input("Telefono", sql.VarChar, Telefono || "")
      .input("Correo", sql.VarChar, Correo || "")
      .input("Contacto", sql.VarChar, Contacto || "").query(`
                INSERT INTO Proveedor (RazonSocial, RUC, Direccion, Telefono, Correo, Contacto, Activo, FechaCreacion)
                VALUES (@RazonSocial, @RUC, @Direccion, @Telefono, @Correo, @Contacto, 1, GETDATE())
            `);
    res.json({ success: true, mensaje: "Proveedor registrado exitosamente." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al registrar el proveedor." });
  }
};

const updateProveedor = async (req, res) => {
  const { id } = req.params;
  const { RazonSocial, RUC, Direccion, Telefono, Correo, Contacto } = req.body;

  if (!regexRUC.test(RUC))
    return res
      .status(400)
      .json({
        success: false,
        mensaje: "El RUC debe tener exactamente 11 números.",
      });
  if (Correo && Correo.trim() !== "" && !regexCorreo.test(Correo))
    return res
      .status(400)
      .json({ success: false, mensaje: "Formato de correo no válido." });

  try {
    const pool = await getConnection();
    const rucExistente = await pool
      .request()
      .input("RUC", sql.VarChar, RUC)
      .input("id", sql.Int, id)
      .query(
        "SELECT ProveedorID FROM Proveedor WHERE RUC = @RUC AND ProveedorID != @id",
      );

    if (rucExistente.recordset.length > 0) {
      return res
        .status(400)
        .json({
          success: false,
          mensaje: "El RUC ingresado pertenece a otro proveedor.",
        });
    }

    await pool
      .request()
      .input("id", sql.Int, id)
      .input("RazonSocial", sql.VarChar, RazonSocial)
      .input("RUC", sql.VarChar, RUC)
      .input("Direccion", sql.VarChar, Direccion || "")
      .input("Telefono", sql.VarChar, Telefono || "")
      .input("Correo", sql.VarChar, Correo || "")
      .input("Contacto", sql.VarChar, Contacto || "").query(`
                UPDATE Proveedor SET 
                    RazonSocial = @RazonSocial, RUC = @RUC, Direccion = @Direccion, 
                    Telefono = @Telefono, Correo = @Correo, Contacto = @Contacto
                WHERE ProveedorID = @id
            `);
    res.json({ success: true, mensaje: "Datos del proveedor actualizados." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al actualizar la información." });
  }
};

const cambiarEstadoProveedor = async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado } = req.body;
  try {
    const pool = await getConnection();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("estado", sql.Bit, nuevoEstado)
      .query("UPDATE Proveedor SET Activo = @estado WHERE ProveedorID = @id");
    res.json({ success: true, mensaje: "Estado del proveedor actualizado." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al cambiar el estado." });
  }
};

const eliminarProveedor = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    await pool
      .request()
      .input("id", id)
      .query("UPDATE Proveedor SET Activo = 0 WHERE ProveedorID = @id");
    res.json({
      success: true,
      mensaje: "Proveedor desactivado correctamente.",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "No se pudo procesar la baja." });
  }
};

const consultarRUC = async (req, res) => {
  const { ruc } = req.params;

  if (!regexRUC.test(ruc)) {
    return res
      .status(400)
      .json({
        success: false,
        mensaje: "El RUC debe tener exactamente 11 números.",
      });
  }

  const token = process.env.DECOLECTA_TOKEN;
  const url = `https://api.decolecta.com/v1/sunat/ruc?numero=${ruc}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    const dataApi = await response.json();

    if (!response.ok) {
      return res
        .status(response.status)
        .json({
          success: false,
          mensaje: dataApi.message || "RUC no válido o error de API externa.",
        });
    }

    const payload = dataApi.data ? dataApi.data : dataApi;
    const resultado = {
      razonSocial:
        payload.razon_social ||
        payload.company_name ||
        payload.nombre_o_razon_social ||
        "Nombre no disponible",
      direccion:
        payload.address ||
        payload.direccion ||
        payload.domicilio_fiscal ||
        payload.direccion_completa ||
        "",
    };

    res.json({ success: true, data: resultado });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        mensaje: "Error de conexión con el proveedor de identidad.",
      });
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