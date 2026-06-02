const { getConnection, sql } = require("../config/db");

// 1. Expresiones Regulares de Validación
const regexDNI = /^\d{8}$/;
const regexRUC = /^\d{11}$/;
const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 2. CONSULTA A API EXTERNA (Decolecta) - Con Filtro de Ahorro
const consultarDocumento = async (req, res) => {
  const { tipo, documento } = req.params;

  // Evitar llamadas inútiles a la API externa
  if (tipo === "dni" && !regexDNI.test(documento)) {
    return res.status(400).json({
      success: false,
      mensaje: "El DNI debe tener exactamente 8 dígitos numéricos.",
    });
  }
  if (tipo === "ruc" && !regexRUC.test(documento)) {
    return res.status(400).json({
      success: false,
      mensaje: "El RUC debe tener exactamente 11 dígitos numéricos.",
    });
  }

  const token = process.env.DECOLECTA_TOKEN;
  const url =
    tipo === "dni"
      ? `https://api.decolecta.com/v1/reniec/dni?numero=${documento}`
      : `https://api.decolecta.com/v1/sunat/ruc?numero=${documento}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    const dataApi = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        mensaje: dataApi.message || "Documento no válido en RENIEC/SUNAT.",
      });
    }

    const payload = dataApi.data ? dataApi.data : dataApi;
    const resultado = {
      nombreCompleto:
        payload.full_name ||
        payload.razon_social ||
        payload.company_name ||
        "Nombre no disponible",
      direccion:
        payload.address || payload.direccion || payload.domicilio_fiscal || "",
      departamento: payload.department || payload.departamento || "",
      provincia: payload.province || payload.provincia || "",
      distrito: payload.district || payload.distrito || "",
    };

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: "Error de conexión con el proveedor de identidad.",
    });
  }
};

// 3. Crear Cliente (Con validación y Anti-Duplicados)
const createCliente = async (req, res) => {
  const {
    TipoDocumento,
    Documento,
    NombreRazonSocial,
    Telefono,
    Correo,
    Direccion,
  } = req.body;

  // Validaciones Estrictas
  if (TipoDocumento === "DNI" && !regexDNI.test(Documento)) {
    return res
      .status(400)
      .json({ success: false, mensaje: "DNI inválido. Deben ser 8 números." });
  }
  if (TipoDocumento === "RUC" && !regexRUC.test(Documento)) {
    return res
      .status(400)
      .json({ success: false, mensaje: "RUC inválido. Deben ser 11 números." });
  }
  if (Correo && Correo.trim() !== "" && !regexCorreo.test(Correo)) {
    return res.status(400).json({
      success: false,
      mensaje: "Formato de correo electrónico no válido.",
    });
  }

  try {
    const pool = await getConnection();

    // Verificación Anti-Duplicados
    const existe = await pool
      .request()
      .input("Doc", sql.VarChar, Documento)
      .query("SELECT ClienteID FROM Cliente WHERE Documento = @Doc");

    if (existe.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        mensaje: "Este número de documento ya está registrado.",
      });
    }

    await pool
      .request()
      .input("TipoDocumento", sql.VarChar, TipoDocumento)
      .input("Documento", sql.VarChar, Documento)
      .input("NombreRazonSocial", sql.VarChar, NombreRazonSocial.trim())
      .input("Telefono", sql.VarChar, Telefono || "")
      .input("Correo", sql.VarChar, Correo ? Correo.trim() : "")
      .input("Direccion", sql.VarChar, Direccion ? Direccion.trim() : "")
      .query(`
                INSERT INTO Cliente (TipoDocumento, Documento, NombreRazonSocial, Telefono, Correo, Direccion, Activo, FechaCreacion)
                VALUES (@TipoDocumento, @Documento, @NombreRazonSocial, @Telefono, @Correo, @Direccion, 1, GETDATE())
            `);
    res.json({ success: true, mensaje: "Cliente creado con éxito" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error crítico al crear cliente." });
  }
};

// 4. Listar Clientes
const getClientes = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
            SELECT 
                ClienteID, TipoDocumento, Documento, NombreRazonSocial, 
                Telefono, Correo, Direccion, Activo, 
                FORMAT(FechaCreacion, 'yyyy-MM-dd HH:mm:ss') AS FechaCreacion
            FROM Cliente 
            ORDER BY FechaCreacion DESC
        `);
    res.json(result.recordset);
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al listar la cartera de clientes." });
  }
};

// 5. Actualizar Cliente (Con validación y Anti-Colisión)
const updateCliente = async (req, res) => {
  const { id } = req.params;
  const {
    TipoDocumento,
    Documento,
    NombreRazonSocial,
    Direccion,
    Telefono,
    Correo,
  } = req.body;

  if (TipoDocumento === "DNI" && !regexDNI.test(Documento)) {
    return res
      .status(400)
      .json({ success: false, mensaje: "DNI inválido. Deben ser 8 números." });
  }
  if (TipoDocumento === "RUC" && !regexRUC.test(Documento)) {
    return res
      .status(400)
      .json({ success: false, mensaje: "RUC inválido. Deben ser 11 números." });
  }
  if (Correo && Correo.trim() !== "" && !regexCorreo.test(Correo)) {
    return res.status(400).json({
      success: false,
      mensaje: "Formato de correo electrónico no válido.",
    });
  }

  try {
    const pool = await getConnection();

    // Verificación Anti-Colisión (Que no le ponga el DNI de otro cliente existente)
    const existe = await pool
      .request()
      .input("Doc", sql.VarChar, Documento)
      .input("ID", sql.Int, id)
      .query(
        "SELECT ClienteID FROM Cliente WHERE Documento = @Doc AND ClienteID != @ID",
      );

    if (existe.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        mensaje: "El documento ingresado pertenece a otro cliente registrado.",
      });
    }

    await pool
      .request()
      .input("ClienteID", sql.Int, id)
      .input("TipoDocumento", sql.VarChar, TipoDocumento)
      .input("Documento", sql.VarChar, Documento)
      .input("NombreRazonSocial", sql.VarChar, NombreRazonSocial.trim())
      .input("Direccion", sql.VarChar, Direccion ? Direccion.trim() : "")
      .input("Telefono", sql.VarChar, Telefono || "")
      .input("Correo", sql.VarChar, Correo ? Correo.trim() : "").query(`
                UPDATE Cliente SET 
                    TipoDocumento = @TipoDocumento,
                    Documento = @Documento, 
                    NombreRazonSocial = @NombreRazonSocial, 
                    Direccion = @Direccion, 
                    Telefono = @Telefono, 
                    Correo = @Correo
                WHERE ClienteID = @ClienteID
            `);
    res.json({
      success: true,
      mensaje: "Ficha del cliente actualizada correctamente.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: "Error al actualizar los datos del cliente.",
    });
  }
};

// 6. Eliminar Cliente Físicamente
const deleteCliente = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    await pool
      .request()
      .input("ClienteID", sql.Int, id)
      .query("DELETE FROM Cliente WHERE ClienteID = @ClienteID");
    res.json({
      success: true,
      mensaje: "Cliente borrado permanentemente de la base de datos.",
    });
  } catch (error) {
    // Captura de Integridad Referencial
    if (error.number === 547) {
      return res.status(400).json({
        success: false,
        mensaje:
          "Violación de integridad: Este cliente ya tiene historial de ventas o cotizaciones. Utilice la opción 'Suspender'.",
      });
    }
    res
      .status(500)
      .json({ success: false, mensaje: "Error al eliminar el cliente." });
  }
};

// 7. Cambiar estado (Activo/Inactivo)
const cambiarEstadoCliente = async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado } = req.body;
  try {
    const pool = await getConnection();
    await pool
      .request()
      .input("ID", sql.Int, id)
      .input("Estado", sql.Bit, nuevoEstado)
      .query("UPDATE Cliente SET Activo = @Estado WHERE ClienteID = @ID");
    res.json({ success: true, mensaje: "Estado operativo actualizado." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al actualizar el estado." });
  }
};

const buscarCliente = async (req, res) => {
  const { q } = req.query;
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("busqueda", sql.VarChar, `%${q}%`)
      .query(
        "SELECT ClienteID, Documento, NombreRazonSocial FROM Cliente WHERE Documento LIKE @busqueda OR NombreRazonSocial LIKE @busqueda",
      );

    res.json(result.recordset);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al buscar cliente." });
  }
};

module.exports = {
  consultarDocumento,
  createCliente,
  getClientes,
  updateCliente,
  deleteCliente,
  cambiarEstadoCliente,
  buscarCliente,
};