import { useCallback, useEffect, useState } from "react";
import {
  Container,
  Box,
  Typography,
  Stack,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Carousel3D from "./components/Carousel3D";
import StoresPanel from "./components/StoresPanel";
import { pathImg } from "../../../api/axios";
import {
  getCatalogBySection,
  getStoresRequest,
  getStoreProductsPublicRequest,
} from "../../../api/inventoryControlRequest.js";
import { activeApp } from "../../../config/appInfo.js";

// 🔗 Iconos de redes
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";

export default function HomeLogout() {
  const theme = useTheme();
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [err, setErr] = useState("");

  // 🔹 Catálogo "home"
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        const { data } = await getCatalogBySection("home", { onlyActive: true });
        if (alive) setProducts(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) {
          setErr(e?.message || "No se pudo cargar catálogo");
          setProducts([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 🔹 Locales (vista pública)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
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
  }, []);

  const loadStoreProducts = useCallback(
    (storeId) => getStoreProductsPublicRequest(storeId),
    []
  );

  return (
    <>
      <Container sx={{ pb: 6 }}>
        <Box sx={{ p: 1 }}>
          <Carousel3D
            title="Productos"
            items={products}
            sectionFilter="home"
            imageBase={pathImg}
          />
        </Box>

        <Box sx={{ p: 1 }}>
          <StoresPanel
            title="Locales"
            items={stores}
            loadStoreProducts={loadStoreProducts}
          />
        </Box>
      </Container>

      {/* 🔸 Pie de página dinámico: adaptado al tema y a todo el ancho */}
      <Box
        component="footer"
        sx={{
          width: "100vw",
          position: "relative",
          left: "50%",
          right: "50%",
          marginLeft: "-50vw",
          marginRight: "-50vw",
          textAlign: "center",
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper, // se adapta al tema
        }}
      >
        <Stack direction="row" justifyContent="center" spacing={2} mb={1}>
          {activeApp.socials?.whatsapp && (
            <IconButton
              component="a"
              href={activeApp.socials.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: theme.palette.text.secondary,
                "&:hover": { color: theme.palette.primary.main },
              }}
            >
              <WhatsAppIcon />
            </IconButton>
          )}
          {activeApp.socials?.facebook && (
            <IconButton
              component="a"
              href={activeApp.socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: theme.palette.text.secondary,
                "&:hover": { color: theme.palette.primary.main },
              }}
            >
              <FacebookIcon />
            </IconButton>
          )}
          {activeApp.socials?.instagram && (
            <IconButton
              component="a"
              href={activeApp.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: theme.palette.text.secondary,
                "&:hover": { color: theme.palette.primary.main },
              }}
            >
              <InstagramIcon />
            </IconButton>
          )}
          {activeApp.socials?.tiktok && (
            <IconButton
              component="a"
              href={activeApp.socials.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: theme.palette.text.secondary, // 👉 define el color aquí
                "&:hover": { color: theme.palette.primary.main },
              }}
              aria-label="TikTok"
            >
              {/* ✅ TikTok coloreable por tema usando mask */}
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  bgcolor: "currentColor", // toma el color del IconButton
                  WebkitMask: "url(./logo_tiktok.svg) no-repeat center / contain",
                  mask: "url(./logo_tiktok.svg) no-repeat center / contain",
                  transition: "transform 0.3s ease",
                  "&:hover": { transform: "scale(1.15)" },
                }}
              />
            </IconButton>
          )}
          {activeApp.socials?.email && (
            <IconButton
              component="a"
              href={`mailto:${activeApp.socials.email}`}
              rel="noopener noreferrer"
              sx={{
                color: theme.palette.text.secondary,
                "&:hover": { color: theme.palette.primary.main },
              }}
            >
              <EmailIcon />
            </IconButton>
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          📞 {activeApp.phone || "0992371711"} — {activeApp.alias}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          © {activeApp.year} {activeApp.author} — Todos los derechos reservados.
        </Typography>
      </Box>
    </>
  );
}
