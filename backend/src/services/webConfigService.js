const repository = require("../repositories/webConfigRepository");
const fs = require("fs");
const path = require("path");

class WebConfigService {
  async obtenerPublica() {
    const logos = await repository.getLogos();
    const sliders = await repository.getSliders();
    return { logos, sliders };
  }

  async agregarLogo(file) {
    if (!file) throw new Error("No hay archivo cargado.");
    const url = `/uploads/web/${file.filename}`;
    await repository.insertLogo(url);
    return url;
  }

  async activarLogo(id) {
    await repository.setActiveLogo(id);
  }

  async eliminarLogo(id) {
    const logo = await repository.getLogoById(id);
    const total = await repository.countLogos();

    if (!logo) throw new Error("El logo no existe.");
    if (logo.Activo || total <= 1)
      throw new Error(
        "Operación denegada: Debes mantener al menos un logo inactivo para poder borrar.",
      );

    if (logo.ImagenURL) this.borrarArchivoFisico(logo.ImagenURL);
    await repository.deleteLogo(id);
  }

  async crearSlider(titulo, desc, file) {
    if (!file) throw new Error("La imagen publicitaria es obligatoria.");
    const url = `/uploads/web/${file.filename}`;
    await repository.insertSlider(titulo || "Promoción", desc || "", url);
  }

  async actualizarSlider(id, titulo, desc, file) {
    let urlNueva = null;
    if (file) {
      const sliderAnterior = await repository.getSliderById(id);
      if (sliderAnterior && sliderAnterior.ImagenURL)
        this.borrarArchivoFisico(sliderAnterior.ImagenURL);
      urlNueva = `/uploads/web/${file.filename}`;
    }
    await repository.updateSlider(
      id,
      titulo || "Promoción",
      desc || "",
      urlNueva,
    );
  }

  async cambiarEstadoSlider(id, estado) {
    if (parseInt(estado) === 0) {
      const activos = await repository.countActiveSliders();
      const slider = await repository.getSliderById(id);
      if (activos <= 1 && slider && slider.Activo) {
        throw new Error(
          "Operación denegada. La tienda requiere al menos un banner activo.",
        );
      }
    }
    await repository.updateSliderStatus(id, estado);
  }

  async eliminarSlider(id) {
    const activos = await repository.countActiveSliders();
    const slider = await repository.getSliderById(id);

    if (!slider) throw new Error("Banner no encontrado.");
    if (slider.Activo && activos <= 1)
      throw new Error(
        "Operación rechazada: No puedes eliminar el único banner activo de la tienda.",
      );

    if (slider.ImagenURL) this.borrarArchivoFisico(slider.ImagenURL);
    await repository.deleteSlider(id);
  }

  borrarArchivoFisico(url) {
    if (url && url.includes("/uploads/web/")) {
      const nom = url.split("/").pop();
      const ruta = path.join(__dirname, "..", "uploads", "web", nom);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }
  }
}

module.exports = new WebConfigService();