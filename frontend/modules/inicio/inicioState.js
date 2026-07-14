export const inicioState = {
    usuarioActivo: null,
    
    init(usuarioString) {
        if(usuarioString) this.usuarioActivo = JSON.parse(usuarioString);
    },
    getUsuarioNombre() {
        if(!this.usuarioActivo) return "Administrador";
        return this.usuarioActivo.NombreUsuario || this.usuarioActivo.Nombre || "Usuario";
    }
};