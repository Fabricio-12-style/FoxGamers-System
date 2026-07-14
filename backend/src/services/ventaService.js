const repository = require("../repositories/ventaRepository");
const { getConnection, sql } = require("../config/db");

class VentaService {
  async procesarVenta(data) {
    if (!data.items || data.items.length === 0)
      throw new Error("El carrito está vacío.");
    return await repository.procesarVentaTransaction(data);
  }

  async listar(q) {
    return await repository.listar(q);
  }

  async anular(id, uid) {
    const pool = await getConnection();
    const check = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT Estado FROM Venta WHERE VentaID = @id");
    if (check.recordset.length === 0) throw new Error("Venta no encontrada.");
    if (check.recordset[0].Estado === "ANULADA")
      throw new Error("La venta ya está anulada.");
    await repository.anularVentaTransaction(id, uid);
  }

  async obtenerTicketCompleto(id) {
    const pool = await getConnection();
    const cab = await pool
      .request()
      .input("id", sql.Int, id)
      .query(
        "SELECT v.*, c.NombreRazonSocial AS ClienteNombre, c.Documento AS ClienteDoc, u.NombreUsuario AS UsuarioNombre FROM Venta v LEFT JOIN Cliente c ON v.ClienteID = c.ClienteID LEFT JOIN Usuario u ON v.UsuarioID = u.UsuarioID WHERE v.VentaID = @id",
      );

    const det = await pool
      .request()
      .input("id", sql.Int, id)
      .query(
        "SELECT dv.*, i.Nombre AS ProductoNombre, i.Codigo AS ProductoCodigo FROM DetalleVenta dv INNER JOIN Inventario i ON dv.ProductoID = i.ProductoID WHERE dv.VentaID = @id",
      );

    const pag = await pool
      .request()
      .input("id", sql.Int, id)
      .query(
        "SELECT Metodo, MontoRecibido, Vuelto FROM VentaPago WHERE VentaID = @id",
      );

    return {
      cabecera: cab.recordset[0],
      detalles: det.recordset,
      pagos: pag.recordset,
    };
  }
}
module.exports = new VentaService();