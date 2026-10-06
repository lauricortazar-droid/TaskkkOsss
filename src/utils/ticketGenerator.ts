export interface TicketDiplomaItem {
  diplomado: string;
  year: string;
  tipoImpresion: string;
  costo: number;
  driveUrl?: string;
}

export interface TicketData {
  id: string;
  nombre: string;
  rol: string;
  grupo: string;
  zona: string;
  email?: string;
  diplomado: string;
  year: string;
  tipoImpresion: string;
  costo: number;
  telefono?: string;
  driveUrl?: string;
  notas?: string;
  items?: TicketDiplomaItem[];
  createdAt?: string;
}

/**
 * Genera un ticket oficial de reconocimiento en formato PNG de alta resolución (800x1160px)
 * y lo descarga automáticamente al dispositivo o galería del usuario.
 */
export function downloadTicketImage(data: TicketData): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(false);
        return;
      }

      // Alta resolución (2x Retina para nitidez máxima en celulares)
      const scale = 2;
      const width = 800;
      const hasNotas = Boolean(data.notas && data.notas.trim());
      const hasEmail = Boolean(data.email && data.email.trim());
      const itemCount = data.items && data.items.length > 0 ? data.items.length : 1;
      const extraItemsHeight = (itemCount - 1) * 36;
      const emailHeight = hasEmail ? 30 : 0;
      const height = (hasNotas ? 1280 : 1180) + extraItemsHeight + emailHeight;
      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);

      // Fondo general blanco con bordes redondeados y sombra
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, width, height);

      // Tarjeta principal blanca
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;
      roundRect(ctx, 30, 30, width - 60, height - 60, 24);
      ctx.fill();

      // Reset sombra
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // Header institucional Azul (#042f66)
      ctx.save();
      ctx.fillStyle = "#042f66";
      roundRectTop(ctx, 30, 30, width - 60, 150, 24);
      ctx.fill();

      // Franja dorada de acento (#f2ad00)
      ctx.fillStyle = "#f2ad00";
      ctx.fillRect(30, 175, width - 60, 6);

      // Textos del Header
      ctx.fillStyle = "#ffd15c";
      ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("UNIVERSIDAD FGDLL • CONTROL DE RECONOCIMIENTOS", width / 2, 70);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 24px system-ui, -apple-system, sans-serif";
      ctx.fillText("COMPROBANTE DE SOLICITUD", width / 2, 105);

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "500 13px system-ui, -apple-system, sans-serif";
      ctx.fillText("DIPLOMADO DE LIDERAZGO I", width / 2, 132);
      ctx.restore();

      // Folio y Fecha
      const folioShort = (data.id || "REC-0000").slice(0, 10).toUpperCase();
      const fechaTexto = new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      ctx.fillStyle = "#f1f5f9";
      roundRect(ctx, 60, 205, width - 120, 50, 12);
      ctx.fill();

      ctx.textAlign = "left";
      ctx.fillStyle = "#042f66";
      ctx.font = "900 15px monospace";
      ctx.fillText(`FOLIO: ${folioShort}`, 80, 236);

      ctx.textAlign = "right";
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText(`EXPEDICIÓN: ${fechaTexto}`, width - 80, 236);

      // SECCIÓN 1: DATOS DEL ALUMNO / SOLICITANTE
      let currentY = 285;
      drawSectionHeader(ctx, "1. DATOS DEL SOLICITANTE", 60, currentY);

      currentY += 24;
      const sec1Height = 110 + (hasEmail ? 28 : 0);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      roundRect(ctx, 60, currentY, width - 120, sec1Height, 14);
      ctx.stroke();

      // Fila 1: Nombre completo
      ctx.textAlign = "left";
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText("NOMBRE COMPLETO:", 80, currentY + 30);
      ctx.fillStyle = "#0f172a";
      ctx.font = "900 17px system-ui, sans-serif";
      ctx.fillText(truncateText(ctx, data.nombre || "Sin Nombre", 400), 220, currentY + 30);

      // Fila 2: Rol y Grupo
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText("ROL / PUESTO:", 80, currentY + 62);
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText(data.rol || "Líder", 220, currentY + 62);

      ctx.fillStyle = "#64748b";
      ctx.fillText("GRUPO:", 440, currentY + 62);
      ctx.fillStyle = "#1e293b";
      ctx.fillText(data.grupo || "G-1", 500, currentY + 62);

      // Fila 3: Zona y Teléfono
      ctx.fillStyle = "#64748b";
      ctx.fillText("SEDE / ZONA:", 80, currentY + 92);
      ctx.fillStyle = "#1e293b";
      ctx.fillText(data.zona || "General", 220, currentY + 92);

      if (data.telefono) {
        ctx.fillStyle = "#64748b";
        ctx.fillText("TELÉFONO:", 440, currentY + 92);
        ctx.fillStyle = "#1e293b";
        ctx.fillText(data.telefono, 520, currentY + 92);
      }

      // Fila 4: Correo (opcional)
      if (hasEmail) {
        ctx.fillStyle = "#64748b";
        ctx.fillText("CORREO:", 80, currentY + 120);
        ctx.fillStyle = "#1e293b";
        ctx.fillText(data.email || "", 220, currentY + 120);
      }

      // SECCIÓN 2: DETALLES DEL RECONOCIMIENTO Y COSTO
      currentY += sec1Height + 25;
      drawSectionHeader(ctx, "2. DETALLES DE IMPRESIÓN Y COSTO", 60, currentY);

      currentY += 24;
      const itemsList = data.items && data.items.length > 0
        ? data.items
        : [{
            diplomado: data.diplomado || "Liderazgo I",
            year: data.year || "2026",
            tipoImpresion: data.tipoImpresion || "Primera Impresión",
            costo: data.costo || 100,
            driveUrl: data.driveUrl,
          }];

      const sec2Height = Math.max(95, 45 + itemsList.length * 36);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      roundRect(ctx, 60, currentY, width - 120, sec2Height, 14);
      ctx.stroke();

      // Render diploma items
      itemsList.forEach((it, idx) => {
        const itemY = currentY + 30 + idx * 36;
        ctx.textAlign = "left";
        ctx.fillStyle = "#64748b";
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.fillText(`${idx + 1}.`, 80, itemY);

        ctx.fillStyle = "#042f66";
        ctx.font = "900 13px system-ui, sans-serif";
        ctx.fillText(`${it.diplomado} (Gen. ${it.year})`, 105, itemY);

        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.fillText(`• ${it.tipoImpresion}`, 275, itemY);

        ctx.fillStyle = "#047857";
        ctx.font = "900 12px monospace";
        ctx.fillText(`$${it.costo}`, 440, itemY);

        if (it.driveUrl) {
          ctx.fillStyle = "#4338ca";
          ctx.font = "bold 10px system-ui, sans-serif";
          ctx.fillText("📁 Drive Vinculado", 495, itemY);
        }
      });

      // Caja Destacada de Total
      ctx.fillStyle = "#ecfdf5";
      ctx.strokeStyle = "#a7f3d0";
      roundRect(ctx, width - 210, currentY + 16, 130, sec2Height - 32, 12);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#047857";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.fillText("TOTAL A PAGAR", width - 145, currentY + (sec2Height / 2) - 10);
      ctx.font = "900 22px system-ui, sans-serif";
      ctx.fillText(`$${data.costo || 100} MXN`, width - 145, currentY + (sec2Height / 2) + 16);

      // SECCIÓN NOTAS (SI EXISTEN)
      currentY += sec2Height + 20;
      if (data.notas && data.notas.trim()) {
        drawSectionHeader(ctx, "3. NOTAS / OBSERVACIONES", 60, currentY);
        currentY += 24;
        ctx.fillStyle = "#fefce8";
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 1;
        roundRect(ctx, 60, currentY, width - 120, 60, 12);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = "left";
        ctx.fillStyle = "#854d0e";
        ctx.font = "italic 12px system-ui, sans-serif";
        wrapText(ctx, `"${data.notas.trim()}"`, 80, currentY + 28, width - 160, 18);
        currentY += 80;
      }

      // SECCIÓN 4: DATOS DE PAGO Y DEPÓSITO SPIN
      drawSectionHeader(ctx, "DATOS DE PAGO (SPIN BY OXXO)", 60, currentY);

      currentY += 24;
      ctx.fillStyle = "#fffbeb";
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 1;
      roundRect(ctx, 60, currentY, width - 120, 160, 16);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = "#78350f";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText("BENEFICIARIA / TITULAR:", 80, currentY + 30);
      ctx.fillStyle = "#0f172a";
      ctx.font = "900 14px system-ui, sans-serif";
      ctx.fillText("LAURA CORTAZAR", 240, currentY + 30);

      ctx.fillStyle = "#78350f";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText("CLABE SPIN:", 80, currentY + 64);
      ctx.fillStyle = "#042f66";
      ctx.font = "900 15px monospace";
      ctx.fillText("728969000008838228", 240, currentY + 64);

      ctx.fillStyle = "#78350f";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText("TARJETA SPIN:", 80, currentY + 98);
      ctx.fillStyle = "#042f66";
      ctx.font = "900 15px monospace";
      ctx.fillText("4217 4701 0045 4061", 240, currentY + 98);

      ctx.fillStyle = "#78350f";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText("DEPÓSITO OXXO:", 80, currentY + 132);
      ctx.fillStyle = "#b45309";
      ctx.font = "900 15px monospace";
      ctx.fillText("2242-1787-4421-1658", 240, currentY + 132);

      // WHATSAPP COMPROBANTE CALLOUT
      currentY += 180;
      ctx.fillStyle = "#059669";
      roundRect(ctx, 60, currentY, width - 120, 50, 14);
      ctx.fill();

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText("📲 ENVÍA TU COMPROBANTE AL WHATSAPP: wa.me/19999011852", width / 2, currentY + 31);

      // FOOTER CON CÓDIGO DE BARRAS DECORATIVO
      currentY += 70;
      drawBarcode(ctx, width / 2 - 120, currentY, 240, 28);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 10px monospace";
      ctx.fillText(`* ${folioShort} - VALIDO PARA IMPRESIÓN Y ENTREGA *`, width / 2, currentY + 44);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "italic 9px system-ui, sans-serif";
      ctx.fillText("Guarda este comprobante en tu galería para cualquier consulta con Laura Cortazar.", width / 2, currentY + 60);

      // Descarga como PNG
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `Ticket_Reconocimiento_${folioShort}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      resolve(true);
    } catch (e) {
      console.error("Error al generar ticket:", e);
      resolve(false);
    }
  });
}

function drawSectionHeader(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.textAlign = "left";
  ctx.fillStyle = "#042f66";
  ctx.font = "900 12px system-ui, sans-serif";
  ctx.fillText(text, x, y);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRectTop(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  let truncated = text;
  while (ctx.measureText(truncated).width > maxWidth && truncated.length > 4) {
    truncated = truncated.slice(0, -1);
  }
  return truncated === text ? text : truncated + "...";
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

function drawBarcode(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.fillStyle = "#334155";
  let curX = x;
  const pattern = [2, 1, 3, 1, 2, 2, 1, 3, 2, 1, 1, 3, 2, 2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 1, 2, 2, 3, 1, 1, 2, 3, 2, 1];
  for (let i = 0; i < pattern.length; i++) {
    const barWidth = pattern[i];
    if (i % 2 === 0) {
      ctx.fillRect(curX, y, barWidth, height);
    }
    curX += barWidth + 1;
    if (curX > x + width) break;
  }
}
