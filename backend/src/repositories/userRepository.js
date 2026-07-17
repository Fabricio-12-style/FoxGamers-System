const { getConnection, sql } = require("../config/db");

class UserRepository {
  async listar() {
    const pool = await getConnection();
    const result = await pool.request().query(`
            SELECT U.UsuarioID, U.NombreCompleto AS Nombre, U.NombreUsuario AS Usuario, U.Correo, 
                   P.Nombre AS Perfil, U.PerfilID, U.Activo 
            FROM Usuario U
            LEFT JOIN Perfil P ON U.PerfilID = P.PerfilID
        `);
    return result.recordset;
  }

  async buscarPorUsuario(usuario, idExcluido = null) {
    const pool = await getConnection();
    let query = "SELECT UsuarioID FROM Usuario WHERE NombreUsuario = @Usuario";
    const request = pool.request().input("Usuario", sql.VarChar, usuario);
    if (idExcluido) {
      query += " AND UsuarioID != @ID";
      request.input("ID", sql.Int, idExcluido);
    }
    const result = await request.query(query);
    return result.recordset[0];
  }

  async crear(data) {
    const pool = await getConnection();
    await pool
      .request()
      .input("PerfilID", sql.Int, data.PerfilID)
      .input("NombreUsuario", sql.VarChar, data.Usuario)
      .input("Contrasena", sql.VarChar, data.PasswordHash)
      .input("NombreCompleto", sql.VarChar, data.Nombre)
      .input("Correo", sql.VarChar, data.Correo).query(`
                INSERT INTO Usuario (PerfilID, NombreUsuario, Contrasena, NombreCompleto, Correo, Activo, FechaCreacion, UltimoAcceso)
                VALUES (@PerfilID, @NombreUsuario, @Contrasena, @NombreCompleto, @Correo, 1, GETDATE(), GETDATE())
            `);
  }

  async actualizar(id, data) {
    const pool = await getConnection();
    const request = pool
      .request()
      .input("UsuarioID", sql.Int, id)
      .input("PerfilID", sql.Int, data.PerfilID)
      .input("NombreUsuario", sql.VarChar, data.Usuario)
      .input("NombreCompleto", sql.VarChar, data.Nombre)
      .input("Correo", sql.VarChar, data.Correo);

    let query = "";
    if (data.PasswordHash) {
      request.input("Contrasena", sql.VarChar, data.PasswordHash);
      query = `UPDATE Usuario SET PerfilID = @PerfilID, NombreUsuario = @NombreUsuario, Contrasena = @Contrasena, NombreCompleto = @NombreCompleto, Correo = @Correo WHERE UsuarioID = @UsuarioID`;
    } else {
      query = `UPDATE Usuario SET PerfilID = @PerfilID, NombreUsuario = @NombreUsuario, NombreCompleto = @NombreCompleto, Correo = @Correo WHERE UsuarioID = @UsuarioID`;
    }
    await request.query(query);
  }

  async cambiarEstado(id, estado) {
    const pool = await getConnection();
    await pool
      .request()
      .input("UsuarioID", sql.Int, id)
      .input("Estado", sql.Bit, estado)
      .query(
        "UPDATE Usuario SET Activo = @Estado WHERE UsuarioID = @UsuarioID",
      );
  }

  async eliminar(id) {
    const pool = await getConnection();
    await pool
      .request()
      .input("UsuarioID", sql.Int, id)
      .query("DELETE FROM Usuario WHERE UsuarioID = @UsuarioID");
  }
}
module.exports = new UserRepository();