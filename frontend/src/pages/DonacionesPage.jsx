/**
 * Donaciones: QR y datos bancarios (imágenes desde /eddeliapi/img/{prefix}/qr/).
 */
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  Link,
  Typography,
} from "@mui/material";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import { buildImageUrl } from "../api/axios.js";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import { MEDIA_PREFIX_FALLBACK } from "../config/deployEnv.js";

const BANCO_LOJA_LOGO =
  "https://play-lh.googleusercontent.com/P1klHkUCDArGPvUoTLx1Ch2DwVImHKM8k8YrK9jHkxs_I4Sp272Qx1S66wQO2xzzFg";

const DONATION_DATA = [
  {
    name: "Edgar Patricio Torres Condolo",
    ci: "1104661598",
    accountNumber: "2951571509",
    bank: "Banco de Loja",
    accountType: "Cuenta de ahorros",
    qrFile: "qr-edgar.png",
  },
  {
    name: "Patricio Alexander Briceño Sarango",
    ci: "1106011420",
    accountNumber: "2904396463",
    bank: "Banco de Loja",
    accountType: "Cuenta de ahorros",
    qrFile: "qr-patricio.png",
  },
];

export default function DonacionesPage() {
  const { settings } = useAppSettings();
  const qrFolder = settings?.qrFolder || `${settings?.mediaFolderPrefix || MEDIA_PREFIX_FALLBACK}/qr`;

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", pb: 4 }}>
      <Typography variant="h4" align="center" gutterBottom fontWeight={700}>
        <VolunteerActivismIcon fontSize="large" sx={{ verticalAlign: "middle", mr: 1 }} />
        Apoya a los creadores
      </Typography>

      <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
        Tu aporte contribuye al desarrollo y mantenimiento del sistema. ¡Gracias por confiar en nosotros!
      </Typography>

      <Grid container spacing={3}>
        {DONATION_DATA.map((donor) => (
          <Grid item xs={12} md={6} key={donor.ci}>
            <Card elevation={4}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Avatar alt="Banco de Loja" src={BANCO_LOJA_LOGO} sx={{ width: 48, height: 48 }} variant="rounded" />
                  <Link href="https://www.bancodeloja.fin.ec/" target="_blank" rel="noopener" fontWeight="bold">
                    {donor.bank}
                  </Link>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={7}>
                    <Typography variant="h6" gutterBottom>
                      {donor.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Cédula:</strong> {donor.ci}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Cuenta:</strong> {donor.accountNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Tipo:</strong> {donor.accountType}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={5} textAlign="center">
                    <Box
                      component="img"
                      src={buildImageUrl(`${qrFolder}/${donor.qrFile}`)}
                      alt={`QR ${donor.name}`}
                      sx={{ width: "100%", maxWidth: 200, borderRadius: 2, boxShadow: 2 }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
