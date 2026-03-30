import * as db from "./db";

// Función para generar el HTML del reporte del proyecto
export async function generateProjectReportHTML(projectId: number): Promise<string> {
  const project = await db.getProjectById(projectId);
  if (!project) {
    throw new Error("Proyecto no encontrado");
  }

  // Obtener datos relacionados
  const photos = await db.getProjectPhotos(projectId);
  const detailRaw = await db.getProjectDetail(projectId);
  const details = detailRaw ? [detailRaw] : [];
  const history = await db.getProjectStatusHistory(projectId);

  // Obtener cliente
  let clientName = "No asignado";
  let clientPhone = "";
  let clientEmail = "";
  if (project.clientId) {
    const client = await db.getClientById(project.clientId);
    if (client) {
      clientName = client.name;
      clientPhone = client.whatsappPhone || "";
      clientEmail = client.email || "";
    }
  }

  // Mapeo de estados
  const statusLabels: Record<string, string> = {
    contacto: "Contacto",
    cotizacion_enviada: "Cotización Enviada",
    cotizacion_aprobada: "Cotización Aprobada",
    adelanto_recibido: "Adelanto Recibido",
    en_diseno: "En Diseño",
    pendiente_modelado: "Pendiente Modelado 3D",
    pendiente_render: "Pendiente Renders",
    aprobacion_final: "Aprobación Final",
    despiece: "Despiece",
    corte: "En Producción - Corte",
    enchape: "En Producción - Enchape",
    ensamble: "En Producción - Ensamble",
    en_instalacion: "Listo para Instalación",
    entregado: "Entregado",
  };

  // Mapeo de tipos de trabajo
  const workTypeLabels: Record<string, string> = {
    cocina: "Cocina Integral",
    closet: "Closet",
    puertas: "Puertas",
    centro_tv: "Centro de TV",
  };

  // Agrupar fotos por etapa
  const photosByStage: Record<string, typeof photos> = {};
  for (const photo of photos) {
    if (!photosByStage[photo.stage]) {
      photosByStage[photo.stage] = [];
    }
    photosByStage[photo.stage].push(photo);
  }

  const stageLabels: Record<string, string> = {
    inicial: "Fotos Iniciales",
    diseno: "Diseño 3D",
    corte: "Corte",
    enchape: "Enchape",
    ensamble: "Ensamble",
    final: "Final",
  };

  // Formatear fecha
  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Generar HTML
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte del Proyecto - ${project.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #14b8a6;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #14b8a6;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #666;
      font-size: 14px;
    }
    .project-title {
      font-size: 24px;
      color: #333;
      margin-top: 20px;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-top: 10px;
      background: #14b8a6;
      color: white;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      color: #14b8a6;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .info-item {
      background: #f9fafb;
      padding: 12px 16px;
      border-radius: 8px;
    }
    .info-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 16px;
      font-weight: 500;
      color: #333;
      margin-top: 4px;
    }
    .photos-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 15px;
    }
    .photo-item {
      aspect-ratio: 1;
      overflow: hidden;
      border-radius: 8px;
      background: #f3f4f6;
    }
    .photo-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-description {
      font-size: 12px;
      color: #666;
      text-align: center;
      margin-top: 4px;
    }
    .timeline {
      position: relative;
      padding-left: 30px;
    }
    .timeline::before {
      content: '';
      position: absolute;
      left: 10px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #e5e7eb;
    }
    .timeline-item {
      position: relative;
      padding-bottom: 20px;
    }
    .timeline-item::before {
      content: '';
      position: absolute;
      left: -24px;
      top: 4px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #14b8a6;
      border: 2px solid white;
      box-shadow: 0 0 0 2px #14b8a6;
    }
    .timeline-date {
      font-size: 12px;
      color: #666;
    }
    .timeline-status {
      font-weight: 600;
      color: #333;
    }
    .timeline-notes {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
    .detail-item {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .detail-type {
      font-size: 12px;
      color: #14b8a6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .detail-title {
      font-weight: 600;
      margin-top: 4px;
    }
    .detail-content {
      font-size: 14px;
      color: #666;
      margin-top: 8px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    @media print {
      .container {
        padding: 20px;
      }
      .photos-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">INNOVAR</div>
      <div class="subtitle">Cocinas de Diseño</div>
      <h1 class="project-title">${project.name}</h1>
      <span class="status-badge">${statusLabels[project.status] || project.status}</span>
    </div>

    <div class="section">
      <h2 class="section-title">Información del Proyecto</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Tipo de Trabajo</div>
          <div class="info-value">${workTypeLabels[project.workType] || project.workType}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Cliente</div>
          <div class="info-value">${clientName}</div>
        </div>
        ${clientPhone ? `
        <div class="info-item">
          <div class="info-label">Teléfono</div>
          <div class="info-value">${clientPhone}</div>
        </div>
        ` : ""}
        ${clientEmail ? `
        <div class="info-item">
          <div class="info-label">Email</div>
          <div class="info-value">${clientEmail}</div>
        </div>
        ` : ""}
        <div class="info-item">
          <div class="info-label">Fecha de Creación</div>
          <div class="info-value">${formatDate(project.createdAt)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Última Actualización</div>
          <div class="info-value">${formatDate(project.updatedAt)}</div>
        </div>
      </div>

    </div>

    ${Object.keys(photosByStage).length > 0 ? `
    <div class="section">
      <h2 class="section-title">Galería de Fotos</h2>
      ${Object.entries(photosByStage).map(([stage, stagePhotos]) => `
        <h3 style="font-size: 14px; color: #666; margin: 15px 0 10px;">${stageLabels[stage] || stage}</h3>
        <div class="photos-grid">
          ${stagePhotos.map(photo => `
            <div class="photo-item">
              <img src="${photo.photoUrl}" alt="${photo.description || "Foto del proyecto"}" />
            </div>
          `).join("")}
        </div>
      `).join("")}
    </div>
    ` : ""}

    ${details.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Detalles del Proyecto</h2>
      ${details.map(detail => `
        <div class="detail-item">
          <div class="detail-type">${detail.type === "medida_especial" ? "Medida Especial" : detail.type === "nota_importante" ? "Nota Importante" : "Foto de Referencia"}</div>
          <div class="detail-title">${detail.title}</div>
          <div class="detail-content">${detail.content}</div>
        </div>
      `).join("")}
    </div>
    ` : ""}

    ${history.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Historial del Proyecto</h2>
      <div class="timeline">
        ${history.map(h => `
          <div class="timeline-item">
            <div class="timeline-date">${formatDate(h.createdAt)}</div>
            <div class="timeline-status">${h.fromStatus ? `${statusLabels[h.fromStatus] || h.fromStatus} → ` : ""}${statusLabels[h.toStatus] || h.toStatus}</div>
            ${h.notes ? `<div class="timeline-notes">${h.notes}</div>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
    ` : ""}

    <div class="footer">
      <p>Reporte generado el ${formatDate(new Date())}</p>
      <p>INNOVAR Cocinas de Diseño - K9 vía Cerritos a Pereira</p>
      <p>Tel: 313 680 2025</p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}
