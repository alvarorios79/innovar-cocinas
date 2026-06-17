-- Agregar categorías de gastos de bodega
ALTER TYPE "op_expense_category" ADD VALUE IF NOT EXISTS 'nomina';
ALTER TYPE "op_expense_category" ADD VALUE IF NOT EXISTS 'cortesia_cliente';
ALTER TYPE "op_expense_category" ADD VALUE IF NOT EXISTS 'gasolina_vehiculos';
ALTER TYPE "op_expense_category" ADD VALUE IF NOT EXISTS 'mantenimiento_moto';
ALTER TYPE "op_expense_category" ADD VALUE IF NOT EXISTS 'mantenimiento_bodega';
ALTER TYPE "op_expense_category" ADD VALUE IF NOT EXISTS 'mantenimiento_maquinaria';
