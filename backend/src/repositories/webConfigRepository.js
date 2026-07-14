const { getConnection, sql } = require("../config/db");

class WebConfigRepository {
  async getLogos() {
    const pool = await getConnection();
    const res = await pool
      .request()
      .query(
        "SELECT LogoID, ImagenURL, Activo FROM GaleriaLogos ORDER BY LogoID DESC",
      );
    return res.recordset;
  }

  async getSliders() {
    const pool = await getConnection();
    const res = await pool
      .request()
      .query(
        "SELECT SliderID as id, Titulo, Descripcion, ImagenURL, Activo FROM SliderPromocional ORDER BY SliderID DESC",
      );
    return res.recordset;
  }

  async insertLogo(url) {
    const pool = await getConnection();
    await pool
      .request()
      .input("url", sql.VarChar(sql.MAX), url)
      .query("INSERT INTO GaleriaLogos (ImagenURL, Activo) VALUES (@url, 0)");
  }

  async setActiveLogo(id) {
    const pool = await getConnection();
    await pool.request().input("id", sql.Int, id).query(`
            BEGIN TRANSACTION;
            BEGIN TRY
                UPDATE GaleriaLogos SET Activo = 0;
                UPDATE GaleriaLogos SET Activo = 1 WHERE LogoID = @id;
                UPDATE ConfiguracionWeb SET LogoURL = (SELECT TOP 1 ImagenURL FROM GaleriaLogos WHERE LogoID = @id), FechaActualizacion = GETDATE() WHERE ConfigID = 1;
                COMMIT TRANSACTION;
            END TRY
            BEGIN CATCH 
                ROLLBACK TRANSACTION;
                THROW;
            END CATCH
        `);
  }

  async getLogoById(id) {
    const pool = await getConnection();
    const res = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT ImagenURL, Activo FROM GaleriaLogos WHERE LogoID = @id");
    return res.recordset[0];
  }

  async countLogos() {
    const pool = await getConnection();
    const res = await pool
      .request()
      .query("SELECT COUNT(*) AS Total FROM GaleriaLogos");
    return res.recordset[0].Total;
  }

  async deleteLogo(id) {
    const pool = await getConnection();
    await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM GaleriaLogos WHERE LogoID = @id");
  }

  async insertSlider(titulo, desc, url) {
    const pool = await getConnection();
    await pool
      .request()
      .input("titulo", sql.VarChar, titulo)
      .input("desc", sql.VarChar, desc)
      .input("url", sql.VarChar(sql.MAX), url)
      .query(
        "INSERT INTO SliderPromocional (Titulo, Descripcion, ImagenURL, Activo, FechaCreacion) VALUES (@titulo, @desc, @url, 1, GETDATE())",
      );
  }

  async getSliderById(id) {
    const pool = await getConnection();
    const res = await pool
      .request()
      .input("id", sql.Int, id)
      .query(
        "SELECT SliderID, ImagenURL, Activo FROM SliderPromocional WHERE SliderID = @id",
      );
    return res.recordset[0];
  }

  async updateSlider(id, titulo, desc, url) {
    const pool = await getConnection();
    let query =
      "UPDATE SliderPromocional SET Titulo = @titulo, Descripcion = @desc";
    const req = pool
      .request()
      .input("id", sql.Int, id)
      .input("titulo", sql.VarChar, titulo)
      .input("desc", sql.VarChar, desc);
    if (url) {
      query += ", ImagenURL = @url";
      req.input("url", sql.VarChar(sql.MAX), url);
    }
    query += " WHERE SliderID = @id";
    await req.query(query);
  }

  async countActiveSliders() {
    const pool = await getConnection();
    const res = await pool
      .request()
      .query(
        "SELECT COUNT(*) as Activos FROM SliderPromocional WHERE Activo = 1",
      );
    return res.recordset[0].Activos;
  }

  async updateSliderStatus(id, estado) {
    const pool = await getConnection();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("estado", sql.Bit, estado)
      .query(
        "UPDATE SliderPromocional SET Activo = @estado WHERE SliderID = @id",
      );
  }

  async deleteSlider(id) {
    const pool = await getConnection();
    await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM SliderPromocional WHERE SliderID = @id");
  }
}

module.exports = new WebConfigRepository();