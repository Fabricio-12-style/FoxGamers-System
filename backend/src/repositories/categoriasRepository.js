const { getConnection, sql } = require("../config/db");

class CategoriasRepository {
  async listar(terminoBusqueda = "") {
    const pool = await getConnection();
    const request = pool.request();
    let query = "";

    if (terminoBusqueda && terminoBusqueda.trim() !== "") {
      request.input("search", sql.VarChar, `%${terminoBusqueda.trim()}%`);
      query = `SELECT CategoriaID, Nombre, Descripcion, Activo 
                     FROM Categoria WHERE Nombre LIKE @search ORDER BY Nombre ASC`;
    } else {
      query = `SELECT TOP 5 CategoriaID, Nombre, Descripcion, Activo 
                     FROM Categoria ORDER BY CategoriaID DESC`;
    }

    const result = await request.query(query);
    return result.recordset;
  }

  async buscarPorNombre(nombre) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("Nombre", sql.VarChar, nombre)
      .query(
        "SELECT CategoriaID FROM Categoria WHERE LOWER(Nombre) = LOWER(@Nombre)",
      );
    return result.recordset[0];
  }

  async crear(nombre, descripcion) {
    const pool = await getConnection();
    await pool
      .request()
      .input("Nombre", sql.VarChar, nombre)
      .input("Descripcion", sql.VarChar, descripcion)
      .query(
        "INSERT INTO Categoria (Nombre, Descripcion) VALUES (@Nombre, @Descripcion)",
      );
  }

  async actualizar(id, nombre, descripcion) {
    const pool = await getConnection();
    await pool
      .request()
      .input("ID", sql.Int, id)
      .input("Nombre", sql.VarChar, nombre)
      .input("Descripcion", sql.VarChar, descripcion)
      .query(
        "UPDATE Categoria SET Nombre = @Nombre, Descripcion = @Descripcion WHERE CategoriaID = @ID",
      );
  }

  async cambiarEstado(id, estado) {
    const pool = await getConnection();
    await pool
      .request()
      .input("ID", sql.Int, id)
      .input("Estado", sql.Bit, estado)
      .query("UPDATE Categoria SET Activo = @Estado WHERE CategoriaID = @ID");
  }

  async eliminar(id) {
    const pool = await getConnection();
    await pool
      .request()
      .input("ID", sql.Int, id)
      .query("DELETE FROM Categoria WHERE CategoriaID = @ID");
  }

  async listarActivas() {
    const pool = await getConnection();
    const result = await pool.request().query(`
            SELECT CategoriaID, Nombre 
            FROM Categoria 
            WHERE Activo = 1 
            ORDER BY Nombre ASC
        `);
    return result.recordset;
  }
}

module.exports = new CategoriasRepository();
