import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const SALT_ROUNDS = 12;

/**
 * Hash una contraseña de forma segura
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifica si una contraseña coincide con el hash almacenado
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Valida la fortaleza de una contraseña
 * Requisitos:
 * - Mínimo 8 caracteres
 * - Al menos una letra mayúscula
 * - Al menos una letra minúscula
 * - Al menos un número
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("La contraseña debe tener al menos 8 caracteres");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una letra mayúscula");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una letra minúscula");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("La contraseña debe contener al menos un número");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Autentica un usuario con email y contraseña
 * Retorna el usuario si las credenciales son válidas, null si no
 */
export async function authenticateWithPassword(
  email: string,
  password: string
): Promise<any | null> {
  const database = await getDb();
  if (!database) {
    throw new Error("Database not available");
  }

  // Buscar usuario por email
  const [user] = await database
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return null;
  }

  // Verificar que el usuario tenga contraseña configurada
  if (!user.passwordHash) {
    return null;
  }

  // Verificar contraseña
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}
