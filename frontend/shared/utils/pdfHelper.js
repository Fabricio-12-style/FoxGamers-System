export const generarCabeceraPDF = (
  doc,
  tituloReporte,
  rangoFechas,
  empresa = {},
  logoBase64,
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const logoSize = 32;
  const colorTitulo = [15, 23, 42];
  const colorTexto = [71, 85, 105];
  const colorLinea = [148, 163, 184];
  let currentY = 15;

  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, currentY, logoSize, logoSize);
  }

  const headingX = logoBase64 ? margin + logoSize + 8 : margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...colorTitulo);
  doc.text(
    empresa?.NombreComercial || empresa?.RazonSocial || "FOX GAMERS",
    headingX,
    currentY + 12,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...colorTexto);

  const detalles = [
    empresa?.RUC ? `R.U.C. ${empresa.RUC}` : null,
    empresa?.Direccion || null,
    empresa?.Telefono ? `Tel: ${empresa.Telefono}` : null,
    empresa?.Correo || null,
    empresa?.Web ? `Web: ${empresa.Web}` : null,
  ].filter(Boolean);

  detalles.forEach((texto, index) => {
    doc.text(texto, pageWidth - margin, currentY + 6 + index * 5, {
      align: "right",
    });
  });

  const separatorY = currentY + logoSize + 8;
  doc.setDrawColor(...colorTitulo);
  doc.setLineWidth(1.5);
  doc.line(margin, separatorY, pageWidth - margin, separatorY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...colorTitulo);
  doc.text(tituloReporte.toUpperCase(), margin, separatorY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...colorTexto);
  doc.text(
    `Fecha impresión: ${new Date().toLocaleDateString("es-PE")}`,
    margin,
    separatorY + 17,
  );
  doc.text(`Rango: ${rangoFechas}`, margin, separatorY + 22);

  doc.setDrawColor(...colorLinea);
  doc.setLineWidth(0.5);
  doc.line(margin, separatorY + 26, pageWidth - margin, separatorY + 26);

  return separatorY + 35;
};

export const estiloTablaCorporativa = {
  theme: "grid",
  headStyles: {
    fillColor: [30, 41, 59],
    textColor: 255,
    halign: "center",
    fontSize: 10,
    fontStyle: "bold",
  },
  bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
  alternateRowStyles: { fillColor: [248, 250, 252] },
  styles: { cellPadding: 4, valign: "middle" },
};

export const convertirImagenABase64 = async (url) => {
  if (!url) return null;
  if (url.startsWith("data:")) return url;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la imagen desde ${url}`);
  }

  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
