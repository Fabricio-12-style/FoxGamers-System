export const descuentosState = {
  listaGlobal: [],

  setLista(lista) {
    this.listaGlobal = lista || [];
  },

  existeConflicto(nuevoDsc, idEditando = null) {
    return this.listaGlobal.some(d => {
      if (idEditando && d.DescuentoID === parseInt(idEditando)) return false;

      const mismoAlcance = d.AplicaA === nuevoDsc.AplicaA;

      const mismaReferencia = (nuevoDsc.AplicaA === 'GENERAL') || (d.ReferenciaID === nuevoDsc.ReferenciaID);

      if (mismoAlcance && mismaReferencia) {
        const ini1 = new Date(nuevoDsc.FechaInicio);
        ini1.setHours(0, 0, 0, 0);
        const fin1 = new Date(nuevoDsc.FechaFin);
        fin1.setHours(23, 59, 59, 999);

        const ini2 = new Date(d.FechaInicio);
        ini2.setHours(0, 0, 0, 0);
        const fin2 = new Date(d.FechaFin);
        fin2.setHours(23, 59, 59, 999);

        return (ini1 <= fin2 && fin1 >= ini2);
      }
      return false;
    });
  }
};