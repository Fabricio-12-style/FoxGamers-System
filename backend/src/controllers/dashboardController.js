const dashboardService = require("../services/dashboardService");

const getResumenKPIs = async (req, res) => {
  try {
    const data = await dashboardService.compilarResumen();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error cargando KPIs del Dashboard:", error);
    res
      .status(500)
      .json({
        success: false,
        mensaje: "Error al cargar el resumen operativo",
      });
  }
};

module.exports = { getResumenKPIs };