export const configState = {
    listaLogosGlobal: [],
    listaSlidersGlobal: [],

    setLogos(logos) {
        this.listaLogosGlobal = logos || [];
    },

    setSliders(sliders) {
        this.listaSlidersGlobal = sliders || [];
    },

    getLogoById(id) {
        return this.listaLogosGlobal.find(l => l.LogoID === id);
    },

    getSliderById(id) {
        return this.listaSlidersGlobal.find(s => (s.SliderID || s.id) === id);
    }
};