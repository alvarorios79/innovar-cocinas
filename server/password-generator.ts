/**
 * Genera una contraseña temporal segura y fácil de recordar
 * Formato: Palabra-####-Símbolo (ej: Innovar-2024-!)
 */
export function generateTemporaryPassword(): string {
  const words = [
    "Innovar", "Cocina", "Diseno", "Hogar", "Espacio",
    "Estilo", "Calidad", "Elegante", "Moderno", "Premium"
  ];
  
  const symbols = ["!", "@", "#", "$", "%"];
  
  const word = words[Math.floor(Math.random() * words.length)];
  const number = Math.floor(1000 + Math.random() * 9000); // 4 dígitos
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  
  return `${word}-${number}${symbol}`;
}

/**
 * Genera una contraseña aleatoria completamente segura
 * Formato: 12 caracteres alfanuméricos + símbolos
 */
export function generateSecurePassword(): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = "";
  
  // Asegurar al menos un carácter de cada tipo
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Completar hasta 12 caracteres
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Mezclar los caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
