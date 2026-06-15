-- Agregar campo publicToken a la tabla projects
-- Usado para validar acceso a la galería pública sin exponer el ID secuencial

ALTER TABLE `projects`
  ADD COLUMN `publicToken` varchar(64) NULL AFTER `accountingClosureId`;

CREATE INDEX `projects_publicToken_idx` ON `projects` (`publicToken`);

-- Generar tokens para proyectos existentes
UPDATE `projects`
SET `publicToken` = CONCAT(
  LPAD(HEX(FLOOR(RAND() * 0xFFFFFFFF)), 8, '0'),
  LPAD(HEX(FLOOR(RAND() * 0xFFFFFFFF)), 8, '0'),
  LPAD(HEX(FLOOR(RAND() * 0xFFFFFFFF)), 8, '0'),
  LPAD(HEX(UNIX_TIMESTAMP() + id), 16, '0')
)
WHERE `publicToken` IS NULL;
