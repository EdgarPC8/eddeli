import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Container } from "@mui/material";

import StoresPanel from "./components/StoresPanel";
import { pathImg } from "../../../api/axios";
import {
  getStoresRequest,
  getStoreProductsPublicRequest,
} from "../../../api/inventoryControlRequest.js";
import { useAppSettings } from "../../../context/AppSettingsContext.jsx";

/**
 * Vista pública de locales (/punto_venta): misma idea que la sección del home sin sesión;
 * tarjetas, detalle y productos por local. La administración va en /inventory/puntos-venta.
 */
export default function StoresPublicPage() {
  const { activeApp } = useAppSettings();
  const showPropia = activeApp?.showPublicStoresPropia !== false;
  const showVitrina = activeApp?.showPublicStoresVitrina !== false;
  const showStores = showPropia || showVitrina;

  const [stores, setStores] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!showStores) {
      setStores([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setErr("");
        const { data } = await getStoresRequest({ isActive: true });
        const arr = Array.isArray(data) ? data : data?.data ?? [];

        const mapped = arr.map((s) => ({
          id: s.id,
          name: s.name,
          address: s.address,
          description: s.description,
          city: s.city,
          province: s.province,
          phone: s.phone,
          email: s.email,
          img: s.imageUrl ? `${pathImg}${s.imageUrl}` : s.img || null,
          position: s.position,
          isActive: s.isActive,
          latitude: s.latitude,
          longitude: s.longitude,
          locationKind: s.locationKind === "propia" ? "propia" : "vitrina",
        }));

        if (alive) setStores(mapped);
      } catch (e) {
        if (alive) {
          setErr(e?.message || "No se pudieron cargar los locales");
          setStores([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [showStores]);

  const loadStoreProducts = useCallback(async (storeId) => {
    const res = await getStoreProductsPublicRequest(storeId);
    return res;
  }, []);

  if (!showStores) {
    return (
      <Container sx={{ pb: 6, pt: 4 }}>
        <Alert severity="info">
          La vista de locales no está disponible en este momento.
        </Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ pb: 6, pt: 2 }}>
      <Box sx={{ p: 1 }}>
        {err ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {err}
          </Alert>
        ) : null}
        <StoresPanel
          title="Locales"
          items={stores}
          maxVisible={stores.length}
          loadStoreProducts={loadStoreProducts}
          publicFacing
          showPropia={showPropia}
          showVitrina={showVitrina}
        />
      </Box>
    </Container>
  );
}
