/**
 * Contenedor de carga con skeleton (para componentes que no son TablePro).
 */
import ContentSkeleton from "./ContentSkeleton.jsx";

export default function PageLoading({
  variant = "page",
  minHeight,
  ...props
}) {
  return (
    <ContentSkeleton
      variant={variant}
      height={typeof minHeight === "number" ? minHeight : undefined}
      {...props}
    />
  );
}
