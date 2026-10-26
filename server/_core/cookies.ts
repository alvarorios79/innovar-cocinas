import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): CookieOptions {
  const isSecure = isSecureRequest(req);

  return {
    httpOnly: true,
    path: "/",
    // "lax" funciona en todos los navegadores incluyendo iOS Safari/ITP.
    // "none" era innecesario: frontend y API comparten el mismo dominio
    // (innovar-cocinas.onrender.com), no es un caso cross-site.
    // iOS Safari bloquea cookies SameSite=None via ITP impidiendo el login.
    sameSite: "lax",
    secure: isSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  };
}
