export const descuentosState = {
  listaGlobal: [],

  setLista(lista) {
    this.listaGlobal = lista || [];
  },

  // 🛡️ ESCUDO ANTI-COLISIÓN DE FECHAS
  existeConflicto(nuevoDsc, idEditando = null) {
    return this.listaGlobal.some(d => {
      // Si estamos editando, ignoramos el descuento actual para que no choque consigo mismo
      if (idEditando && d.DescuentoID === parseInt(idEditando)) return false;

      // Verificamos si aplica al mismo lugar
      const mismoAlcance = d.AplicaA === nuevoDsc.AplicaA;

      // Si es Categoría o Producto, debe ser el mismo ID. Si es General, choca con otros Generales.
      const mismaReferencia = (nuevoDsc.AplicaA === 'GENERAL') || (d.ReferenciaID === nuevoDsc.ReferenciaID);

      if (mismoAlcance && mismaReferencia) {
        // Verificamos cruce de fechas (Lógica: Inicio1 <= Fin2 AND Fin1 >= Inicio2)
        const ini1 = new Date(nuevoDsc.FechaInicio);
        ini1.setHours(0, 0, 0, 0);
        const fin1 = new Date(nuevoDsc.FechaFin);
        fin1.setHours(23, 59, 59, 999);

        const ini2 = new Date(d.FechaInicio);
        ini2.setHours(0, 0, 0, 0);
        const fin2 = new Date(d.FechaFin);
        fin2.setHours(23, 59, 59, 999);

        // Si las fechas se traslapan, HAY CONFLICTO
        return (ini1 <= fin2 && fin1 >= ini2);
      }
      return false;
    });
  }
};