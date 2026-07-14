const nodemailer = require("nodemailer");
const puppeteer = require("puppeteer");
const ventaService = require("../services/ventaService");
const empresaService = require("../services/empresaService"); 

const finalizarVenta = async (req, res) => {
  try {
    const result = await ventaService.procesarVenta(req.body);
    res.json({
      success: true,
      mensaje: "Venta procesada con éxito",
      ventaID: result.ventaID,
      NumeroDoc: result.NumeroDoc,
    });
  } catch (error) {
    console.error("🚨 ERROR EN FINALIZAR VENTA:", error);
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

const getVentas = async (req, res) => {
  try {
    res.json(await ventaService.listar(req.query.q));
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al cargar historial." });
  }
};

const getVentaById = async (req, res) => {
  try {
    const data = await ventaService.obtenerTicketCompleto(req.params.id);
    res.json({ success: true, ...data });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, mensaje: "Error al obtener ticket." });
  }
};

const anularVenta = async (req, res) => {
  try {
    await ventaService.anular(req.params.id, req.body.UsuarioID);
    res.json({
      success: true,
      mensaje: "Venta anulada. El stock regresó al inventario.",
    });
  } catch (error) {
    res.status(400).json({ success: false, mensaje: error.message });
  }
};

// =======================================================
// GENERACIÓN DE PDF Y ENVÍO POR CORREO
// =======================================================
const enviarTicketPorCorreo = async (req, res) => {
  const { id } = req.params;
  const { correoDestino } = req.body;

  if (!correoDestino)
    return res
      .status(400)
      .json({ success: false, mensaje: "Se requiere un correo de destino." });

  try {
    const dataTicket = await ventaService.obtenerTicketCompleto(id);
    if (!dataTicket || !dataTicket.cabecera) {
      return res
        .status(404)
        .json({ success: false, mensaje: "Venta no encontrada." });
    }

    let emp = {
      NombreComercial: "FOX GAMERS",
      Direccion: "---",
      Telefono: "---",
      Correo: "---",
      Web: "---",
      RUC: "---",
    };
    try {
      const empresaData = await empresaService.obtenerEmpresa();
      if (empresaData) emp = empresaData;
    } catch (e) {
      console.warn("Aviso: Usando datos de empresa por defecto en PDF.");
    }

    const { cabecera, detalles, pagos } = dataTicket;
    const sumaDescuentosGral = detalles.reduce(
      (acc, item) => acc + (parseFloat(item.Descuento) || 0),
      0,
    );

    const fechaObj = new Date(cabecera.FechaVenta);
    const fechaLimpia = isNaN(fechaObj.getTime())
      ? cabecera.FechaVenta
      : fechaObj.toISOString().split("T")[0];

    let filasItems = "";
    detalles.forEach((item) => {
      filasItems += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 15px 10px; text-align: center; font-weight: bold; color: #0f172a;">${parseFloat(item.Cantidad).toFixed(2)}</td>
                <td style="padding: 15px 10px; text-align: center; color: #94a3b8; font-size: 11px;">UND</td>
                <td style="padding: 15px 10px; text-align: left;">
                <strong style="color: #0f172a; font-size: 13px;">${item.ProductoNombre}</strong><br>
                <span style="color: #94a3b8; font-size: 11px;">${item.ProductoCodigo || "N/A"}</span>
                </td>
                <td style="padding: 15px 10px; text-align: right; color: #334155;">S/ ${parseFloat(item.PrecioUnitario).toFixed(2)}</td>
                <td style="padding: 15px 10px; text-align: right; font-weight: bold; color: #0f172a;">S/ ${parseFloat(item.Subtotal).toFixed(2)}</td>
            </tr>`;
    });

    let listaPagosHtml = "";
    if (pagos.length > 0) {
      pagos.forEach((p) => {
        listaPagosHtml += `
                <tr>
                <td style="padding: 4px 0; color: #0f172a; font-size: 12px;">• ${p.Metodo}:</td>
                <td style="padding: 4px 0; text-align: right; color: #0f172a; font-size: 12px;">S/ ${parseFloat(p.MontoRecibido).toFixed(2)}</td>
                </tr>`;
        if (p.Metodo === "EFECTIVO" && parseFloat(p.Vuelto) > 0) {
          listaPagosHtml += `
                    <tr>
                    <td style="padding: 4px 0; color: #ef4444; font-size: 12px;">Vuelto entregado:</td>
                    <td style="padding: 4px 0; text-align: right; color: #ef4444; font-size: 12px;">-S/ ${parseFloat(p.Vuelto).toFixed(2)}</td>
                    </tr>`;
        }
      });
    } else {
      listaPagosHtml = `
            <tr>
                <td style="padding: 4px 0; color: #0f172a; font-size: 12px;">• ${cabecera.MetodoPago}:</td>
                <td style="padding: 4px 0; text-align: right; color: #0f172a; font-size: 12px;">S/ ${cabecera.Total.toFixed(2)}</td>
            </tr>`;
    }

    const htmlComprobante = `
        <html>
            <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
                body { font-family: 'Montserrat', sans-serif; background-color: #ffffff; padding: 20px; }
            </style>
            </head>
            <body>
            <div style="max-width: 800px; margin: 0 auto;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 25px;">
                <tr>
                    <td width="60%">
                    <h1 style="margin: 0; color: #0f172a; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">${emp.NombreComercial}</h1>
                    <p style="margin: 5px 0 0 0; color: #475569; font-size: 12px;">${emp.Direccion}</p>
                    <p style="margin: 2px 0 0 0; color: #475569; font-size: 12px;">Tel: ${emp.Telefono} | Web: ${emp.Web || emp.Correo}</p>
                    </td>
                    <td width="40%" align="right">
                    <table cellpadding="0" cellspacing="0" style="width: 200px;">
                        <tr><td style="background-color: #0f172a; color: #a3e635; text-align: center; padding: 8px; font-size: 11px; font-weight: bold; letter-spacing: 1px;">R.U.C. ${emp.RUC}</td></tr>
                        <tr><td style="background-color: #0f172a; color: #a3e635; text-align: center; padding: 8px; font-size: 11px; font-weight: bold; letter-spacing: 1px; border-top: 1px solid #475569;">NOTA DE VENTA</td></tr>
                        <tr><td style="background-color: #ffffff; border: 2px solid #0f172a; border-top: none; text-align: center; padding: 12px; font-size: 20px; font-weight: bold; color: #0f172a; border-radius: 0 0 6px 6px;">${cabecera.NumeroDoc}</td></tr>
                    </table>
                    </td>
                </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td width="48%" style="background-color: #f8fafc; border-left: 5px solid #a3e635; padding: 20px; border-radius: 0 6px 6px 0; vertical-align: top;">
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Datos del Cliente</p>
                    <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px; text-transform: uppercase;">${cabecera.ClienteNombre || "PÚBLICO GENERAL"}</h3>
                    <p style="margin: 0; color: #334155; font-size: 12px;"><strong>Documento:</strong> ${cabecera.ClienteDoc || "---"}</p>
                    </td>
                    <td width="4%"></td> 
                    <td width="48%" style="background-color: #f8fafc; border-left: 5px solid #eab308; padding: 20px; border-radius: 0 6px 6px 0; vertical-align: top;">
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Detalles de Emisión</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #334155;">
                        <tr><td style="padding-bottom: 4px;"><strong>Fecha:</strong></td><td style="padding-bottom: 4px;">${fechaLimpia}</td></tr>
                        <tr><td style="padding-bottom: 4px;"><strong>Pago:</strong></td><td style="padding-bottom: 4px;">${cabecera.MetodoPago}</td></tr>
                        <tr><td><strong>Vendedor:</strong></td><td>${cabecera.UsuarioNombre || "Cajero"}</td></tr>
                    </table>
                    </td>
                </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; background-color: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0;">
                <thead style="background-color: #0f172a; color: #ffffff;">
                    <tr>
                    <th style="padding: 12px 10px; font-size: 10px; letter-spacing: 1px; text-align: center;">CANT.</th>
                    <th style="padding: 12px 10px; font-size: 10px; letter-spacing: 1px; text-align: center;">UND.</th>
                    <th style="padding: 12px 10px; font-size: 10px; letter-spacing: 1px; text-align: left;">DESCRIPCIÓN</th>
                    <th style="padding: 12px 10px; font-size: 10px; letter-spacing: 1px; text-align: right;">P. UNIT.</th>
                    <th style="padding: 12px 10px; font-size: 10px; letter-spacing: 1px; text-align: right;">IMPORTE</th>
                    </tr>
                </thead>
                <tbody>${filasItems}</tbody>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                    <td width="48%" style="vertical-align: bottom;">
                    <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border: 1px dashed #cbd5e1;">
                        <p style="margin: 0 0 10px 0; color: #0f172a; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                        <span style="color: #64748b;">■</span> DESGLOSE DE MEDIOS DE PAGO:
                        </p>
                        <table width="100%" cellpadding="0" cellspacing="0">${listaPagosHtml}</table>
                    </div>
                    </td>
                    <td width="4%"></td> 
                    <td width="48%" style="vertical-align: bottom;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; margin-bottom: 10px;">
                        <tr><td style="color: #64748b; padding: 4px 15px;">Subtotal:</td><td align="right" style="color: #0f172a; font-weight: bold; padding: 4px 15px;">S/ ${cabecera.Subtotal.toFixed(2)}</td></tr>
                        <tr><td style="color: #ef4444; padding: 4px 15px;">Descuento:</td><td align="right" style="color: #ef4444; font-weight: bold; padding: 4px 15px;">${sumaDescuentosGral > 0 ? `-S/ ${sumaDescuentosGral.toFixed(2)}` : `S/ 0.00`}</td></tr>
                    </table>
                    <div style="background-color: #0f172a; border-radius: 6px; padding: 15px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="color: #ffffff; font-size: 14px; font-weight: bold; letter-spacing: 2px;">TOTAL</td>
                            <td align="right" style="color: #a3e635; font-size: 24px; font-weight: bold;">S/ ${cabecera.Total.toFixed(2)}</td>
                        </tr>
                        </table>
                    </div>
                    </td>
                </tr>
                </table>
                <div style="text-align: center; margin-top: 60px; color: #0f172a;">
                <h3 style="margin: 0; font-size: 16px;">¡GRACIAS POR SU PREFERENCIA!</h3>
                <p style="margin: 8px 0 0 0; color: #64748b; font-size: 11px;">Representación impresa de la nota de venta generada por el sistema.</p>
                </div>
            </div>
            </body>
        </html>
        `;

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(htmlComprobante, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "30px", bottom: "30px", left: "30px", right: "30px" },
    });
    await browser.close();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const cuerpoHtmlCorreo = `
        <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a; border-bottom: 2px solid #a3e635; padding-bottom: 10px;">¡Hola, ${cabecera.ClienteNombre || "Cliente"}!</h2>
            <p>Agradecemos enormemente tu compra y confianza en <strong>${emp.NombreComercial}</strong>.</p>
            <p>Adjunto a este correo electrónico encontrarás tu comprobante electrónico formal (<strong>Nota de Venta N° ${cabecera.NumeroDoc}</strong>) en formato PDF para tus registros personales.</p>
            <p>Si tienes alguna consulta sobre tus productos o necesitas soporte técnico, nuestro equipo estará encantado de atenderte.</p>
            <br>
            <p style="margin: 0;">Saludos cordiales,</p>
            <p style="margin: 5px 0 0 0; font-weight: bold; color: #0f172a;">El Equipo de ${emp.NombreComercial}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 20px;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">Por favor, no respondas directamente a este correo automático.</p>
        </div>
        `;

    await transporter.sendMail({
      from: `"${emp.NombreComercial}" <${process.env.EMAIL_USER}>`,
      to: correoDestino,
      subject: `Comprobante Electrónico - ${cabecera.NumeroDoc} - ${emp.NombreComercial}`,
      html: cuerpoHtmlCorreo,
      attachments: [
        {
          filename: `Nota_Venta_${cabecera.NumeroDoc}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    res.json({
      success: true,
      mensaje: "Comprobante en PDF enviado exitosamente por correo.",
    });
  } catch (error) {
    console.error("Error al enviar correo con PDF:", error);
    res
      .status(500)
      .json({
        success: false,
        mensaje: "Error al generar o enviar el comprobante.",
      });
  }
};

module.exports = {
  finalizarVenta,
  getVentas,
  getVentaById,
  anularVenta,
  enviarTicketPorCorreo,
};