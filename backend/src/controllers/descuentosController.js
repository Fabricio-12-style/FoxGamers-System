const { getConnection, sql } = require("../config/db");

const getDescuentos = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT
        d.DescuentoID, d.Nombre, d.Descripcion, d.TipoDescuento, d.Valor,
        d.FechaInicio, d.FechaFin, d.Activo, d.AplicaA, d.ReferenciaID,
        d.ModoControl,
        CASE
          WHEN d.AplicaA = 'CATEGORIA' THEN c.Nombre
          WHEN d.AplicaA = 'PRODUCTO'  THEN i.Nombre
          ELSE 'General'
        END AS NombreReferencia,
        d.FechaCreacion
      FROM Descuento d
      LEFT JOIN Categoria  c ON d.AplicaA = 'CATEGORIA' AND d.ReferenciaID = c.CategoriaID
      LEFT JOIN Inventario  i ON d.AplicaA = 'PRODUCTO'  AND d.ReferenciaID = i.ProductoID
      ORDER BY d.FechaCreacion DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error al obtener descuentos:", error);
    res.status(500).json({ success: false, mensaje: "Error al listar descuentos." });
  }
};

const getDescuentoById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Descuento WHERE DescuentoID = @id");
    if (result.recordset.length === 0)
      return res.status(404).json({ success: false, mensaje: "Descuento no encontrado." });
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ success: false, mensaje: "Error al obtener descuento." });
  }
};

const createDescuento = async (req, res) => {
  const { Nombre, Descripcion, TipoDescuento, Valor, FechaInicio, FechaFin, AplicaA, ReferenciaID, ModoControl } = req.body;

  if (!Nombre?.trim())
    return res.status(400).json({ success: false, mensaje: "El nombre es obligatorio." });
  if (!["PORCENTAJE", "MONTO_FIJO"].includes(TipoDescuento))
    return res.status(400).json({ success: false, mensaje: "TipoDescuento inválido." });
  if (!Valor || isNaN(Valor) || Number(Valor) <= 0)
    return res.status(400).json({ success: false, mensaje: "El valor debe ser mayor a 0." });
  if (TipoDescuento === "PORCENTAJE" && Number(Valor) > 100)
    return res.status(400).json({ success: false, mensaje: "El porcentaje no puede superar 100%." });
  if (!FechaInicio || !FechaFin)
    return res.status(400).json({ success: false, mensaje: "Las fechas son obligatorias." });
  if (new Date(FechaInicio) >= new Date(FechaFin))
    return res.status(400).json({ success: false, mensaje: "Fecha inicio debe ser anterior a fecha fin." });
  if (!["GENERAL", "CATEGORIA", "PRODUCTO"].includes(AplicaA))
    return res.status(400).json({ success: false, mensaje: "AplicaA inválido." });
  if (AplicaA !== "GENERAL" && !ReferenciaID)
    return res.status(400).json({ success: false, mensaje: "Selecciona una referencia." });

  const modoFinal = ["AUTO", "FORZAR_ON", "FORZAR_OFF"].includes(ModoControl) ? ModoControl : "AUTO";
  const activoInicial = modoFinal === "FORZAR_ON" ? 1 : 0;

  try {
    const pool = await getConnection();
    const existe = await pool.request()
      .input("Nombre", sql.VarChar, Nombre.trim())
      .query("SELECT DescuentoID FROM Descuento WHERE Nombre = @Nombre");
    if (existe.recordset.length > 0)
      return res.status(400).json({ success: false, mensaje: "Ya existe un descuento con ese nombre." });

    await pool.request()
      .input("Nombre",        sql.VarChar,        Nombre.trim())
      .input("Descripcion",   sql.VarChar,        Descripcion || "")
      .input("TipoDescuento", sql.VarChar,        TipoDescuento)
      .input("Valor",         sql.Decimal(18, 2), Number(Valor))
      .input("FechaInicio",   sql.Date,           new Date(FechaInicio))
      .input("FechaFin",      sql.Date,           new Date(FechaFin))
      .input("AplicaA",       sql.VarChar,        AplicaA)
      .input("ReferenciaID",  sql.Int,            ReferenciaID || null)
      .input("ModoControl",   sql.VarChar,        modoFinal)
      .input("Activo",        sql.Bit,            activoInicial)
      .query(`
        INSERT INTO Descuento
          (Nombre, Descripcion, TipoDescuento, Valor, FechaInicio, FechaFin,
           AplicaA, ReferenciaID, ModoControl, Activo, FechaCreacion)
        VALUES
          (@Nombre, @Descripcion, @TipoDescuento, @Valor, @FechaInicio, @FechaFin,
           @AplicaA, @ReferenciaID, @ModoControl, @Activo, GETDATE())
      `);
    res.status(201).json({ success: true, mensaje: "Descuento creado correctamente." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: "Error al crear el descuento." });
  }
};

const updateDescuento = async (req, res) => {
  const { id } = req.params;
  const { Nombre, Descripcion, TipoDescuento, Valor, FechaInicio, FechaFin, AplicaA, ReferenciaID, ModoControl } = req.body;

  if (!Nombre?.trim())
    return res.status(400).json({ success: false, mensaje: "El nombre es obligatorio." });
  if (!["PORCENTAJE", "MONTO_FIJO"].includes(TipoDescuento))
    return res.status(400).json({ success: false, mensaje: "TipoDescuento inválido." });
  if (!Valor || isNaN(Valor) || Number(Valor) <= 0)
    return res.status(400).json({ success: false, mensaje: "El valor debe ser mayor a 0." });
  if (TipoDescuento === "PORCENTAJE" && Number(Valor) > 100)
    return res.status(400).json({ success: false, mensaje: "El porcentaje no puede superar 100%." });
  if (!FechaInicio || !FechaFin)
    return res.status(400).json({ success: false, mensaje: "Las fechas son obligatorias." });
  if (new Date(FechaInicio) >= new Date(FechaFin))
    return res.status(400).json({ success: false, mensaje: "Fecha inicio debe ser anterior a fecha fin." });

  const modoFinal = ["AUTO", "FORZAR_ON", "FORZAR_OFF"].includes(ModoControl) ? ModoControl : "AUTO";
  const activoFinal = modoFinal === "FORZAR_ON" ? 1 : 0;

  try {
    const pool = await getConnection();
    const existe = await pool.request()
      .input("id",     sql.Int,     id)
      .input("Nombre", sql.VarChar, Nombre.trim())
      .query("SELECT DescuentoID FROM Descuento WHERE Nombre = @Nombre AND DescuentoID <> @id");
    if (existe.recordset.length > 0)
      return res.status(400).json({ success: false, mensaje: "Ya existe otro descuento con ese nombre." });

    await pool.request()
      .input("id",            sql.Int,            id)
      .input("Nombre",        sql.VarChar,        Nombre.trim())
      .input("Descripcion",   sql.VarChar,        Descripcion || "")
      .input("TipoDescuento", sql.VarChar,        TipoDescuento)
      .input("Valor",         sql.Decimal(18, 2), Number(Valor))
      .input("FechaInicio",   sql.Date,           new Date(FechaInicio))
      .input("FechaFin",      sql.Date,           new Date(FechaFin))
      .input("AplicaA",       sql.VarChar,        AplicaA)
      .input("ReferenciaID",  sql.Int,            ReferenciaID || null)
      .input("ModoControl",   sql.VarChar,        modoFinal)
      .input("Activo",        sql.Bit,            activoFinal)
      .query(`
        UPDATE Descuento SET
          Nombre        = @Nombre,
          Descripcion   = @Descripcion,
          TipoDescuento = @TipoDescuento,
          Valor         = @Valor,
          FechaInicio   = @FechaInicio,
          FechaFin      = @FechaFin,
          AplicaA       = @AplicaA,
          ReferenciaID  = @ReferenciaID,
          ModoControl   = @ModoControl,
          Activo        = @Activo
        WHERE DescuentoID = @id
      `);
    res.json({ success: true, mensaje: "Descuento actualizado correctamente." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: "Error al actualizar el descuento." });
  }
};

const deleteDescuento = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Descuento WHERE DescuentoID = @id");
    res.json({ success: true, mensaje: "Descuento eliminado correctamente." });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: "Error al eliminar el descuento." });
  }
};

const getDescuentosVigentes = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT DescuentoID, Nombre, TipoDescuento, Valor, AplicaA, ReferenciaID
      FROM Descuento
      WHERE Activo = 1
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ success: false, mensaje: "Error al obtener descuentos vigentes." });
  }
};

module.exports = {
  getDescuentos,
  getDescuentoById,
  createDescuento,
  updateDescuento,
  deleteDescuento,
  getDescuentosVigentes,
};