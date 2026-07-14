const { getConnection, sql } = require("../config/db");

class PerfilRepository {
  async listar() {
    const pool = await getConnection();
    const result = await pool
      .request()
      .query(
        "SELECT PerfilID, Nombre, Descripcion, Activo, FechaCreacion FROM Perfil",
      );
    return result.recordset;
  }

  async buscarPorNombre(nombre) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("Nombre", sql.VarChar, nombre)
      .query("SELECT PerfilID FROM Perfil WHERE Nombre = @Nombre");
    return result.recordset[0];
  }

  async crear(data) {
    const pool = await getConnection();
    await pool
      .request()
      .input("Nombre", sql.VarChar, data.Nombre)
      .input("Descripcion", sql.VarChar, data.Descripcion)
      .query(
        "INSERT INTO Perfil (Nombre, Descripcion, Activo, FechaCreacion) VALUES (@Nombre, @Descripcion, 1, GETDATE())",
      );
  }

  async actualizar(id, data) {
    const pool = await getConnection();
    await pool
      .request()
      .input("PerfilID", sql.Int, id)
      .input("Nombre", sql.VarChar, data.Nombre)
      .input("Descripcion", sql.VarChar, data.Descripcion)
      .query(
        "UPDATE Perfil SET Nombre = @Nombre, Descripcion = @Descripcion WHERE PerfilID = @PerfilID",
      );
  }

  async cambiarEstado(id, estado) {
    const pool = await getConnection();
    await pool
      .request()
      .input("PerfilID", sql.Int, id)
      .input("Estado", sql.Bit, estado)
      .query("UPDATE Perfil SET Activo = @Estado WHERE PerfilID = @PerfilID");
  }

  async eliminar(id) {
    const pool = await getConnection();
    await pool
      .request()
      .input("PerfilID", sql.Int, id)
      .query("DELETE FROM Perfil WHERE PerfilID = @PerfilID");
  }

  async obtenerPermisos(perfilId) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("PerfilID", sql.Int, perfilId)
      .query(
        "SELECT ModuloNombre FROM ModuloPerfil WHERE PerfilID = @PerfilID AND TieneAcceso = 1",
      );
    return result.recordset.map((r) => r.ModuloNombre);
  }

  async guardarPermisosTransaction(perfilId, modulos) {
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
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}
module.exports = new PerfilRepository();