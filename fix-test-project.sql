-- Actualizar el proyecto de prueba para que tenga dataOrigin='test'
UPDATE projects 
SET dataOrigin = 'test' 
WHERE name = 'TEST-NO-DISCOUNT-PROJECT';

-- Verificar que se actualizó
SELECT id, name, dataOrigin, clientId 
FROM projects 
WHERE name = 'TEST-NO-DISCOUNT-PROJECT';
