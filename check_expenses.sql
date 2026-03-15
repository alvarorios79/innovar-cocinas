SELECT 
  id,
  description,
  amount,
  DATE(expenseDate) as expense_date,
  DATE(createdAt) as created_date,
  DATEDIFF(DATE(createdAt), DATE(expenseDate)) as days_difference,
  expenseType
FROM expenses
ORDER BY expenseDate DESC;
