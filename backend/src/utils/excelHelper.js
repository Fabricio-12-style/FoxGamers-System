const aplicarCabeceraExcel = (
  worksheet,
  tituloReporte,
  rangoFechas,
  empresa,
) => {
  const nombreComercial =
    empresa?.NombreComercial || empresa?.RazonSocial || "FOX GAMERS";
  const ruc = empresa?.RUC ? `R.U.C. ${empresa.RUC}` : "";
  const direccion = empresa?.Direccion || "";
  const contacto = [empresa?.Telefono, empresa?.Correo, empresa?.Web]
    .filter(Boolean)
    .join(" | ");

  worksheet.mergeCells("A1:E1");
  const titleRow = worksheet.getCell("A1");
  titleRow.value = nombreComercial;
  titleRow.font = {
    name: "Arial",
    size: 18,
    bold: true,
    color: { argb: "FF0F172A" },
  };
  titleRow.alignment = { horizontal: "left", vertical: "middle" };

  worksheet.mergeCells("A2:E2");
  const rucRow = worksheet.getCell("A2");
  rucRow.value = ruc;
  rucRow.font = {
    name: "Arial",
    size: 10,
    bold: true,
    color: { argb: "FF475569" },
  };
  rucRow.alignment = { horizontal: "left" };

  worksheet.mergeCells("A3:E3");
  const direccionRow = worksheet.getCell("A3");
  direccionRow.value = direccion;
  direccionRow.font = { name: "Arial", size: 10, color: { argb: "FF475569" } };
  direccionRow.alignment = { horizontal: "left" };

  worksheet.mergeCells("A4:E4");
  const contactoRow = worksheet.getCell("A4");
  contactoRow.value = contacto;
  contactoRow.font = {
    name: "Arial",
    size: 10,
    italic: true,
    color: { argb: "FF475569" },
  };
  contactoRow.alignment = { horizontal: "left" };

  worksheet.mergeCells("A5:E5");
  const subtitleRow = worksheet.getCell("A5");
  subtitleRow.value = tituloReporte;
  subtitleRow.font = {
    name: "Arial",
    size: 12,
    bold: true,
    color: { argb: "FF1E293B" },
  };
  subtitleRow.alignment = { horizontal: "left" };

  worksheet.mergeCells("A6:E6");
  const dateRangeRow = worksheet.getCell("A6");
  dateRangeRow.value = `Periodo analizado: ${rangoFechas}`;
  dateRangeRow.font = { name: "Arial", size: 10, italic: true };
  dateRangeRow.alignment = { horizontal: "left" };

  worksheet.addRow([]);
};

const aplicarEstilosEncabezadoTabla = (headerRow) => {
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" },
  };
  headerRow.font = { color: { argb: "FFFFFFFF" }, bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
};

module.exports = { aplicarCabeceraExcel, aplicarEstilosEncabezadoTabla };
