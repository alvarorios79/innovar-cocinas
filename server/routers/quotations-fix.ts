// CÓDIGO SIMPLIFICADO PARA ACTUALIZAR PROYECTO
// Reemplazar las líneas 305-370 en quotations.ts

        // Actualizar proyecto si esta cotizacion esta vinculada a uno
        if (newTotal) {
          try {
            console.log(`[UPDATE_QUOTATION] Buscando proyecto para cotizacion ${id}, newTotal: ${newTotal}`);
            
            // Buscar proyecto vinculado a esta cotización
            const linkedProject = await db.getProjectByQuotationId(id);
            
            if (linkedProject) {
              console.log(`[UPDATE_QUOTATION] Encontrado proyecto ${linkedProject.id}, actualizando totalAmount a ${newTotal}`);
              await db.updateProject(linkedProject.id, {
                totalAmount: newTotal.toString(),
              });
              console.log(`[UPDATE_QUOTATION] Proyecto actualizado exitosamente`);
            } else {
              console.log(`[UPDATE_QUOTATION] No se encontró proyecto para cotizacion ${id}`);
            }
          } catch (error) {
            console.error("[UPDATE_QUOTATION] Error updating project amount:", error);
          }
        } else {
          console.log(`[UPDATE_QUOTATION] newTotal es null/undefined, no se actualiza proyecto`);
        }
