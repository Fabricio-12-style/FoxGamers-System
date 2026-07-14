export const perfilesState = {
    listaPerfilesGlobal: [],
    perfilEditandoId: null,
    perfilSeleccionadoParaPermisos: null,

    setPerfiles(perfiles) { this.listaPerfilesGlobal = perfiles || []; },
    getPerfiles() { return this.listaPerfilesGlobal; },
    getPerfilById(id) { return this.listaPerfilesGlobal.find(p => p.PerfilID === id); },

    setEditandoId(id) { this.perfilEditandoId = id; },
    getEditandoId() { return this.perfilEditandoId; },

    setPerfilPermisos(id) { this.perfilSeleccionadoParaPermisos = id; },
    getPerfilPermisos() { return this.perfilSeleccionadoParaPermisos; }
};