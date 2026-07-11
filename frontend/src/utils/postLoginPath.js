/**
 * Ruta de inicio tras login según rol activo.
 * Empleado → operación (caja); Admin/Programador → dashboard.
 */
export function getPostLoginPath(loginRol) {
  const role = String(loginRol || "").trim();
  if (role === "Empleado") return "/caja";
  return "/";
}
