// Fuente ÚNICA de los datos del PDF de una cotización.
// TODOS los caminos que muestran/descargan/envían el PDF (CRM, vista previa, correo,
// WhatsApp, portal del cliente, enlace público, versiones) deben usar esta función
// para que el PDF sea siempre idéntico.
import * as db from "./db";
import { buildKitchenQuoteDescription, appendHouseStandards } from "./kitchen-description";
import { buildTVQuoteDescription } from "./tv-description";

export async function buildQuotationPdfData(quotation: any, client: any, items: any[]) {
  // Preparar datos para el PDF
  // Ordenar items por itemNumber
  const sortedItems = [...items].sort((a, b) => (a.itemNumber || 0) - (b.itemNumber || 0));
  
  const pdfData = {
    quotationNumber: quotation.quotationNumber,
    date: new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
    clientName: client?.name || 'Cliente',
    clientPhone: client?.whatsappPhone || undefined,
    clientAddress: client?.address || undefined,
    vendorName: quotation.vendorName,
    productType: quotation.productType,
    validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '',
    items: sortedItems.map(item => {
      let description = item.description;
      
      // Parsear hardwareSelections si es string JSON
      const hardwareSelections = item.hardwareSelections && typeof item.hardwareSelections === 'string'
        ? JSON.parse(item.hardwareSelections)
        : item.hardwareSelections;
      
      // Parsear closetConfig si es string JSON (manejar doble serialización)
      let closetConfig = item.closetConfig;
      if (closetConfig && typeof closetConfig === 'string') {
        try {
          closetConfig = JSON.parse(closetConfig);
          // Si el resultado es un string, hacer otro parse
          if (typeof closetConfig === 'string') {
            closetConfig = JSON.parse(closetConfig);
          }
        } catch (e) {
          closetConfig = null;
        }
      }
      
      // Parsear doorConfig si es string JSON
      const doorConfig = item.doorConfig && typeof item.doorConfig === 'string'
        ? JSON.parse(item.doorConfig)
        : item.doorConfig;
      
      // Parsear tvCenterConfig si es string JSON
      const tvCenterConfig = item.tvCenterConfig && typeof item.tvCenterConfig === 'string'
        ? JSON.parse(item.tvCenterConfig)
        : item.tvCenterConfig;
      
      // Si es closet y tiene closetConfig, generar descripción detallada
      if (item.itemType === 'closet' && closetConfig) {
        const lines: string[] = [];
        const typeLabels: Record<string, string> = {
          'estandar': 'Closet Estándar',
          'especial': 'Closet Especial',
          'empotrado': 'Closet Empotrado'
        };
        const doorLabels: Record<string, string> = {
          'corredizas': 'Puertas Corredizas',
          'batientes': 'Puertas Batientes'
        };
        
        lines.push(`${typeLabels[closetConfig.type] || closetConfig.type.toUpperCase()}`);
        lines.push(`Dimensiones: ${closetConfig.width}m (ancho) x ${closetConfig.height}m (alto)`);
        lines.push(`Profundidad: ${closetConfig.type === 'especial' ? '0.45cm o menos' : '0.60cm'}`);
        lines.push(`Área: ${closetConfig.squareMeters.toFixed(2)} M²`);
        lines.push(`Precio por M²: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(closetConfig.pricePerSquareMeter)}`);
        lines.push(`${doorLabels[closetConfig.doorType] || closetConfig.doorType}`);
        lines.push('');
        lines.push('Incluye:');
        lines.push('• Maletero');
        lines.push('• Divisor');
        lines.push('• Doble colgadero');
        lines.push('• Entrepaños');
        lines.push('• Doble cajonero');
        lines.push('• Zapatero');
        if (closetConfig.type === 'empotrado') {
          lines.push('• Espaldar y laterales completos');
        }
        
        // Agregar notas si existen
        if (closetConfig.notes && closetConfig.notes.trim()) {
          lines.push('');
          lines.push('Notas adicionales:');
          lines.push(closetConfig.notes);
        }
        
        description = lines.join('\n');
      }
      // Si es herrajes y tiene hardwareSelections, generar descripción detallada
      else if (item.itemType === 'herrajes' && hardwareSelections && Array.isArray(hardwareSelections) && hardwareSelections.length > 0) {
        const lines: string[] = [];
        lines.push('HERRAJES SELECCIONADOS');
        lines.push('');
        
        hardwareSelections.forEach((hw: any) => {
          const price = parseFloat(hw.price || '0');
          const subtotal = hw.subtotal || (price * hw.quantity);
          lines.push(`• ${hw.name}`);
          lines.push(`  Cantidad: ${hw.quantity} | Precio unitario: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price)} | Subtotal: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(subtotal)}`);
        });
        
        description = lines.join('\n');
      }
      // Si es puerta y tiene doorConfig, generar descripción detallada
      else if (item.itemType === 'puerta' && doorConfig) {
        const lines: string[] = [];
        const typeLabels: Record<string, string> = {
          'batiente': 'Puerta Batiente',
          'corrediza': 'Puerta Corrediza'
        };
        const colorLabels: Record<string, string> = {
          'aluminio': 'Color Aluminio',
          'negro': 'Color Negro'
        };
        
        // Verificar si es estructura nueva (lista de puertas) o antigua (puerta única)
        if (doorConfig.doors && Array.isArray(doorConfig.doors)) {
          // Nueva estructura: lista de puertas
          const totalDoors = doorConfig.doors.reduce((sum: number, d: any) => sum + (d.quantity || 1), 0);
          lines.push('PUERTAS - MADERA MACIZA TIPO RH');
          lines.push(`Total: ${totalDoors} ${totalDoors === 1 ? 'puerta' : 'puertas'}`);
          lines.push('');
          
          doorConfig.doors.forEach((door: any, idx: number) => {
            const qty = door.quantity || 1;
            const lineTotal = door.lineTotal || (door.pricePerUnit * qty);
            lines.push(`Puerta ${idx + 1}: ${typeLabels[door.type] || door.type}`);
            lines.push(`  • Medidas: ${door.width}cm × ${door.height}m`);
            lines.push(`  • Cantidad: ${qty} ${qty === 1 ? 'unidad' : 'unidades'}`);
            lines.push(`  • Accesorios: ${colorLabels[door.hardwareColor] || door.hardwareColor}`);
            lines.push(`  • Dintel: ${door.hasLintel ? 'Sí' : 'No'}`);
            if (door.location) {
              lines.push(`  • Ubicación: ${door.location}`);
            }
            if (door.notes) {
              lines.push(`  • Notas: ${door.notes}`);
            }
            if (door.height > 2.40) {
              lines.push(`  • Precio base: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(door.pricePerUnit)}`);
              lines.push(`  • Plus empate extra (altura >2.40m): ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(350000)} / unidad`);
              lines.push(`  • Precio total c/plus: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(door.pricePerUnit + 350000)}`);
            } else {
              lines.push(`  • Precio unitario: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(door.pricePerUnit)}`);
            }
            if (qty > 1) {
              lines.push(`  • Subtotal: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(lineTotal)}`);
            }
            if (idx < doorConfig.doors.length - 1) lines.push('');
          });
          
          lines.push('');
          lines.push('Puertas macizas de 36 mm de espesor, enchapada a 4 lados con marco y material RH. con chapa gama alta, tope de puerta y totalmente instalada.');
          
          // Transporte e imprevistos
          if (doorConfig.includeTransport && doorConfig.transportCost) {
            lines.push('');
            lines.push(`Transporte e Imprevistos: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(doorConfig.transportCost)}`);
          }
        } else {
          // Estructura antigua: puerta única (compatibilidad)
          lines.push(`${typeLabels[doorConfig.type] || doorConfig.type.toUpperCase()} - MADERA MACIZA TIPO RH`);
          lines.push(`Cantidad: ${doorConfig.quantity || 1} ${(doorConfig.quantity || 1) === 1 ? 'unidad' : 'unidades'}`);
          lines.push(`Ancho: ${doorConfig.width}cm (Rango: ${doorConfig.widthRange}cm)`);
          lines.push(`Altura: ${doorConfig.height}m (máx 2.40m)`);
          lines.push(`Precio por unidad: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(doorConfig.pricePerUnit)}`);
          lines.push('');
          lines.push('Incluye:');
          lines.push('• Marco RH');
          lines.push('• Chapa gama alta');
          lines.push('• Bisagras omega');
          lines.push('• Tope de puerta');
          lines.push(`• Accesorios: ${colorLabels[doorConfig.hardwareColor] || doorConfig.hardwareColor}`);
          lines.push('• Instalación completa');
          
          if (doorConfig.type === 'corrediza') {
            lines.push('• Sistema de riel incluido');
          }
        }
        
        // Agregar notas si existen
        if (doorConfig.notes && doorConfig.notes.trim()) {
          lines.push('');
          lines.push('Notas adicionales:');
          lines.push(doorConfig.notes);
        }
        
        description = lines.join('\n');
      }
      // Si es baño y tiene bathroomConfig, generar descripción detallada
      else if (item.itemType === 'baño' && item.bathroomConfig) {
        const bc = item.bathroomConfig;
        const fmtCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
        const typeLabel = bc.furnitureType === 'flotante' ? 'Mueble de Baño Flotante' : 'Mueble de Baño de Piso con Pata';
        const lines: string[] = [];
        lines.push(typeLabel.toUpperCase());
        lines.push(`Medidas: ${bc.width}cm (ancho) × ${bc.depth}cm (prof.) × ${bc.height}cm (alto)`);
        lines.push(`Tipo de lavabo: ${bc.sinkType === 'excavado' ? 'Excavado (lavamanos integrado en piedra)' : 'Lavamanos de sobreponer'}`);
        if (bc.widthRange === 'mayor-120') {
          lines.push(`Ancho superior a 120cm — precio calculado proporcionalmente`);
        }
        lines.push('');
        lines.push('Madera aglomerada tipo RH de alta presión, cantos rígidos en puertas y tapas.');
        if (bc.hasExcavado && bc.excavadoMaterial) {
          lines.push(`Excavado en ${bc.excavadoMaterial} — incluye salpicadero de 10cm. Llave/grifo no incluida.`);
        }
        if (bc.hasMeson && bc.mesonMaterial) {
          lines.push(`Mesón en ${bc.mesonMaterial} — incluye salpicadero de 10cm. Llave/grifo no incluida. Lavamanos de sobreponer no incluido.`);
        }
        lines.push('');
        lines.push(`Precio madera: ${fmtCOP(bc.pricePerUnit)} / unidad`);
        if (bc.quantity > 1) lines.push(`Cantidad: ${bc.quantity} unidades`);
        if (bc.notes && bc.notes.trim()) {
          lines.push('');
          lines.push(`Notas: ${bc.notes}`);
        }
        description = lines.join('\n');
      }
      // Si es centro_tv y tiene tvCenterConfig, generar descripción detallada
      else if (item.itemType === 'centro_tv' && tvCenterConfig && buildTVQuoteDescription(tvCenterConfig)) {
        description = buildTVQuoteDescription(tvCenterConfig) as string;
      }
      // (centro de TV de cotizaciones antiguas: texto original)
      else if (item.itemType === 'centro_tv' && tvCenterConfig) {
        const lines: string[] = [];
        const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
        
        lines.push('CENTRO DE TV - MUEBLE FLOTANTE');
        lines.push(`Ancho: ${tvCenterConfig.width}m`);
        lines.push(`Repisas flotantes: ${tvCenterConfig.floatingShelves}`);
        lines.push('');
        lines.push('Incluye:');
        lines.push('• Mueble flotante');
        lines.push('• Panel para TV con alistonado');
        lines.push(`• ${tvCenterConfig.floatingShelves} repisas flotantes`);
        
        if (tvCenterConfig.hasHighGloss) {
          lines.push('• Acabado alto brillo');
        }
        if (tvCenterConfig.hasLedLights) {
          lines.push('• Iluminación LED');
        }
        if (tvCenterConfig.equipmentSpaces > 0) {
          lines.push(`• ${tvCenterConfig.equipmentSpaces} espacios para equipos`);
        }
        
        lines.push('');
        lines.push('Desglose:');
        lines.push(`• Mueble base ${tvCenterConfig.width}m: ${formatCurrency(tvCenterConfig.basePrice)}`);
        if (tvCenterConfig.hasHighGloss) {
          lines.push(`• Alto brillo: ${formatCurrency(tvCenterConfig.highGlossPrice)}`);
        }
        if (tvCenterConfig.hasLedLights) {
          lines.push(`• Iluminación LED: ${formatCurrency(tvCenterConfig.ledLightsPrice)}`);
        }
        if (tvCenterConfig.extraShelvesPrice > 0) {
          lines.push(`• Repisas adicionales: ${formatCurrency(tvCenterConfig.extraShelvesPrice)}`);
        }
        if (tvCenterConfig.equipmentSpacesPrice > 0) {
          lines.push(`• Espacios para equipos: ${formatCurrency(tvCenterConfig.equipmentSpacesPrice)}`);
        }
        if (tvCenterConfig.includeTransport && tvCenterConfig.transportCost) {
          lines.push(`• Transporte e imprevistos: ${formatCurrency(tvCenterConfig.transportCost)}`);
        }
        
        if (tvCenterConfig.notes && tvCenterConfig.notes.trim()) {
          lines.push('');
          lines.push('Notas adicionales:');
          lines.push(tvCenterConfig.notes);
        }
        
        description = lines.join('\n');
      }
      // Si es mesones y tiene countertopConfig, generar descripción detallada
      else if (item.itemType === 'mesones' && item.countertopConfig) {
        const config = typeof item.countertopConfig === 'string' 
          ? JSON.parse(item.countertopConfig) 
          : item.countertopConfig;
        
        const lines: string[] = [];
        const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
        
        // Verificar si es el nuevo formato con múltiples mesones
        if (config.mesones && Array.isArray(config.mesones)) {
          lines.push('MESONES EN PIEDRA');
          lines.push('');
          
          config.mesones.forEach((meson: any, index: number) => {
            const tipoTexto = meson.tipo === 'meson' ? 'Mesón Estándar' : meson.tipo === 'isla' ? 'Isla' : 'Barra';
            const materialTexto = meson.material === 'quarzo' ? 'Quarzo' : 'Sinterizado';
            
            lines.push(`${index + 1}. ${tipoTexto.toUpperCase()} EN ${materialTexto.toUpperCase()}`);
            lines.push(`   ${meson.metrosLineales}ML x ${meson.fondo}cm de fondo`);
            
            // Incluidos según tipo
            if (meson.tipo === 'meson') {
              lines.push('   Incluye: Regrueso en el visto' + (meson.incluyeSalpicaderoAlto ? ', Salpicadero alto' : ', Salpicadero bajo 10cm'));
              lines.push('   Pegado lavaplatos + Lavaplatos 45x37cm');
            } else if (meson.tipo === 'isla') {
              const extras = [];
              extras.push('Regrueso en el visto');
              if (meson.incluyeLaterales) extras.push('Laterales (1.8ML)');
              if (meson.incluyeRegrueso) extras.push('Regrueso adicional (0.9ML)');
              lines.push(`   Incluye: ${extras.join(', ')}`);
            } else if (meson.tipo === 'barra') {
              const extras = [];
              extras.push('Regrueso en los vistos');
              if (!meson.incluyeSalpicaderoAlto) extras.push('Salpicadero bajo 10cm');
              else extras.push('Salpicadero alto');
              if (meson.alturaLateral > 0) extras.push(`Lateral ${meson.alturaLateral}cm`);
              lines.push(`   Incluye: ${extras.join(', ')}`);
            }
            
            lines.push(`   Subtotal: ${formatCurrency(meson.subtotal)}`);
            lines.push('');
          });
          
          if (config.includeTransport && config.transportCost) {
            lines.push(`Transporte e imprevistos: ${formatCurrency(config.transportCost)}`);
          }
          
          if (config.notes && config.notes.trim()) {
            lines.push('');
            lines.push('Notas: ' + config.notes);
          }
        } else {
          // Formato antiguo (un solo mesón)
          const tipoTexto = config.tipo === 'meson' ? 'MESÓN' : config.tipo === 'isla' ? 'ISLA' : 'BARRA';
          const materialTexto = config.material === 'quarzo' ? 'QUARZO' : 'SINTERIZADO';
          
          lines.push(`${tipoTexto} EN ${materialTexto}`);
          lines.push(`Metros lineales: ${config.metrosLineales}ML`);
          lines.push(`Fondo: ${config.fondo}cm`);
          lines.push('');
          lines.push('Incluye:');
          lines.push('• Regrueso en el visto');
          
          if (config.tipo === 'meson') {
            if (!config.incluyeSalpicaderoAlto) {
              lines.push('• Salpicadero bajo 10cm');
            } else {
              lines.push('• Salpicadero alto (duplica metraje)');
            }
            lines.push('• Pegado de lavaplatos (incluye lavaplatos 45x37cm)');
          } else if (config.tipo === 'barra') {
            if (!config.incluyeSalpicaderoAlto) {
              lines.push('• Salpicadero bajo 10cm');
            } else {
              lines.push('• Salpicadero alto (duplica metraje)');
            }
          }
          
          if (config.tipo === 'isla' && config.incluyeLaterales) {
            lines.push('• Laterales de isla (1.8ML)');
          }
          if (config.tipo === 'isla' && config.incluyeRegrueso) {
            lines.push('• Regrueso de isla (0.9ML x 60cm)');
          }
          if (config.tipo === 'barra' && config.alturaLateral > 0) {
            lines.push(`• Lateral de barra (${config.alturaLateral}cm)`);
          }
          
          if (config.includeTransport && config.transportCost) {
            lines.push(`• Transporte e imprevistos: ${formatCurrency(config.transportCost)}`);
          }
          
          if (config.notes && config.notes.trim()) {
            lines.push('');
            lines.push('Notas adicionales:');
            lines.push(config.notes);
          }
        }
        
        description = lines.join('\n');
      }
      // Si es cocina y tiene kitchenConfig, generar descripción detallada
      else if (item.itemType === 'cocina' && item.kitchenConfig) {
        description = buildKitchenQuoteDescription(item.kitchenConfig, item.description);
      }
      // Si es mueble_cocina y tiene kitchenConfig, generar descripción
      else if (item.itemType === 'mueble_cocina' && item.kitchenConfig) {
        const cfg: any = typeof item.kitchenConfig === 'string'
          ? JSON.parse(item.kitchenConfig)
          : item.kitchenConfig;
        if (cfg?.tipoPieza) {
          const lines: string[] = [];
          const pieceLabels: Record<string, string> = {
            'isla': 'Isla',
            'barra': 'Barra',
            'mueble_alto': 'Mueble Alto',
            'mueble_bajo': 'Mueble Bajo',
            'nicho_nevecon': 'Nicho Nevecon',
            'nicho_nevera': 'Nicho Nevera',
            'alacena_entrepanos': 'Alacena (Entrepaños)',
            'alacena_herraje': 'Alacena (Herraje)',
            'torre_hornos': 'Torre de Hornos',
          };
          const pieceLabel = pieceLabels[cfg.tipoPieza] || cfg.tipoPieza;
          const madreraStr = cfg.madreraML ? ` — ${cfg.madreraML}ml` : '';
          lines.push(`${pieceLabel.toUpperCase()} A MEDIDA${madreraStr}`);
          if (cfg.tipoPieza === 'alacena_herraje' && cfg.alacenaHerrajePrecio > 0) {
            lines.push(`• Precio herraje: $${Number(cfg.alacenaHerrajePrecio).toLocaleString('es-CO')}`);
          }
          const moduloLabels: Record<string, string> = {
            'esquineroSuperior': 'Esquinero superior',
            'moduloExtractor': 'Módulo extractor',
            'moduloMicroondas': 'Módulo microondas',
            'especiero': 'Especiero',
            'botellero': 'Botellero',
            'moduloRepisa': 'Módulo repisa',
            'moduloAlmacSup': 'Módulo almacenamiento sup.',
            'esquinero1x1': 'Esquinero 1×1 inferior',
            'cajoneroTriple': 'Cajonero triple',
            'cajoneroDoble': 'Cajonero doble',
            'basurero': 'Basurero integrado',
            'moduloEstufaHorno': 'Módulo estufa/horno',
            'moduloAlmacInf': 'Módulo almacenamiento inf.',
          };
          const mods = cfg.modulosDescriptivos || {};
          const activeModulos = Object.entries(moduloLabels)
            .filter(([key]) => (mods as any)[key] === true)
            .map(([, label]) => `  • ${label}`);
          if (activeModulos.length > 0) {
            lines.push('Módulos:');
            lines.push(...activeModulos);
          }
          if (cfg.incluyeMeson) {
            const mesonMaterials: Record<string, string> = { 'granito': 'Granito', 'cuarzo': 'Cuarzo', 'sinterizado': 'Sinterizado' };
            const matBase = mesonMaterials[cfg.mesonMaterial] || cfg.mesonMaterial || '';
            const matLabel = cfg.mesonEsImportado ? `${matBase} Importado` : matBase;
            const mesonParts: string[] = [`Mesón: ${matLabel}`];
            if (cfg.mesonML) mesonParts.push(`${cfg.mesonML}ml`);
            if (cfg.mesonFondo) { const f = cfg.mesonFondo > 5 ? (cfg.mesonFondo / 100).toFixed(2) : cfg.mesonFondo; mesonParts.push(`fondo ${f}m`); }
            lines.push(mesonParts.join(' — '));
            const mesonExtras: string[] = [];
            if (cfg.mesonIncluyeLaterales) mesonExtras.push('laterales');
            if (cfg.mesonIncluyeRegrueso) mesonExtras.push('regrueso');
            if (cfg.mesonIncluyeSalpicaderoAlto) mesonExtras.push('salpicadero alto');
            if (mesonExtras.length > 0) lines.push(`  Extras mesón: ${mesonExtras.join(', ')}`);
            if (cfg.incluyeLavaplatos) lines.push(`  Lavaplatos y pegado${cfg.lavaprecio ? ' $' + cfg.lavaprecio.toLocaleString('es-CO') : ''}`);
          }
          if (cfg.incluyeLed && cfg.ledML) {
            lines.push(`LED: ${cfg.ledML}ml`);
          }
          if (cfg.incluyePintado) {
            lines.push('Incluye pintado');
          }
          if (cfg.notas?.trim()) {
            lines.push('');
            lines.push(cfg.notas.trim());
          }
          description = lines.join('\n');
        }
      }
      // Si es acabados_especiales y tiene kitchenConfig, generar descripción
      else if (item.itemType === 'acabados_especiales' && item.kitchenConfig) {
        const cfg: any = typeof item.kitchenConfig === 'string'
          ? JSON.parse(item.kitchenConfig)
          : item.kitchenConfig;
        const lines: string[] = [];
        lines.push('ACABADOS ESPECIALES');
        if (cfg?.aluminumGlassDoors && cfg.aluminumGlassDoors.length > 0) {
          const totalDoors = cfg.aluminumGlassDoors.length;
          const totalSqm = cfg.aluminumGlassDoors.reduce((sum: number, d: any) => sum + (d.height * d.width), 0);
          lines.push(`• Puertas aluminio + vidrio ahumado: ${totalDoors} ${totalDoors === 1 ? 'puerta' : 'puertas'} (${totalSqm.toFixed(2)} m²)`);
          cfg.aluminumGlassDoors.forEach((door: any, idx: number) => {
            const sqm = door.height * door.width;
            const extraHinges = door.height > 1.4 ? 2 : (door.height > 0.8 ? 1 : 0);
            const hingeText = extraHinges > 0 ? ` (+${extraHinges} par${extraHinges > 1 ? 'es' : ''} bisagras)` : '';
            lines.push(`  - Puerta ${idx + 1}: ${door.height.toFixed(2)}m x ${door.width.toFixed(2)}m = ${sqm.toFixed(2)} m²${hingeText}`);
          });
        }
        if (cfg?.ledLighting?.enabled && cfg.ledLighting.meters > 0) {
          lines.push(`• LED para alacenas: ${cfg.ledLighting.meters.toFixed(2)}ml`);
        }
        if (lines.length > 1) description = lines.join('\n');
      }
      
      // Usar descripción personalizada si existe
      description = appendHouseStandards(item.itemType, description);
      const customDescriptions = quotation.customDescriptions as Record<number, string> | null;
      const itemIndex = item.itemNumber - 1; // itemNumber es 1-based
      if (customDescriptions && customDescriptions[itemIndex]) {
        description = customDescriptions[itemIndex];
      }

    // Para puerta: mostrar cantidad real de puertas desde doorConfig
    let pdfQuantity = item.quantity;
    if (item.itemType === 'puerta' && doorConfig) {
      if (doorConfig.doors && Array.isArray(doorConfig.doors)) {
        const totalDoors = doorConfig.doors.reduce((s: number, d: any) => s + (d.quantity || 1), 0);
        pdfQuantity = String(totalDoors);
      } else if (doorConfig.quantity) {
        pdfQuantity = String(doorConfig.quantity);
      }
    }
      return {
        itemNumber: item.itemNumber,
        description,
        quantity: pdfQuantity,
        unitPrice: item.unitPrice || '',
        totalPrice: item.totalPrice,
      };
    }),
    subtotal: String(parseFloat(String(quotation.subtotal)) || 0),
    transportCost: String(parseFloat(String(quotation.transportCost)) || 0),
    discountPercent: String(parseFloat(String(quotation.discountPercent)) || 0),
    discountAmount: String(parseFloat(String(quotation.discountAmount)) || 0),
    includeIva: (quotation as any).includeIva === 1,
    ivaAmount: (quotation as any).includeIva === 1
      ? String((parseFloat(String(quotation.subtotal)) - parseFloat(String(quotation.discountAmount || "0"))) * 0.19)
      : undefined,
    total: String(parseFloat(String(quotation.total)) || 0),
    generalNotes: quotation.generalNotes || '',
    versionNumber: quotation.versionNumber || 1,
    baseQuotationNumber: quotation.baseQuotationId ? (await db.getQuotationById(quotation.baseQuotationId))?.quotationNumber : undefined,
  };

  return pdfData;
}
