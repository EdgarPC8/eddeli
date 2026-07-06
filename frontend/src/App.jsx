import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./context/ProtectedRoute.jsx";
import PublicOnlyRoute from "./context/PublicOnlyRoute.jsx";
import NavBar from "./components/NavBar.jsx";
import Login from "./pages/Login.jsx";
import HomeLogout from "./pages/eddeli/inventoryControl/HomeLogout.jsx";
import DashBoardPage from "./pages/eddeli/inventoryControl/DashBoardPage.jsx";
import ProductsPage from "./pages/eddeli/inventoryControl/ProductsPage.jsx";
import CategoryPage from "./pages/eddeli/inventoryControl/CategoryPage.jsx";
import TramosPage from "./pages/eddeli/inventoryControl/TramosPage.jsx";
import UnitPage from "./pages/eddeli/inventoryControl/UnitPage.jsx";
import MovementPage from "./pages/eddeli/inventoryControl/MovementPage.jsx";
import RecipePage from "./pages/eddeli/inventoryControl/RecipePage.jsx";
import GenericIngredientsPage from "./pages/eddeli/inventoryControl/GenericIngredientsPage.jsx";
import OrderPage from "./pages/eddeli/inventoryControl/OrderPage.jsx";
import CustomerPage from "./pages/eddeli/inventoryControl/CustomerPage.jsx";
import SupplierPage from "./pages/eddeli/inventoryControl/SupplierPage.jsx";
import FinancePage from "./pages/eddeli/inventoryControl/FinancePage.jsx";
import LoansDebtsPage from "./pages/eddeli/inventoryControl/LoansDebtsPage.jsx";
import RecurringExpensesPage from "./pages/eddeli/inventoryControl/RecurringExpensesPage.jsx";
import CollectionsPage from "./pages/eddeli/inventoryControl/CollectionsPage.jsx";
import ProductionManagerPage from "./pages/eddeli/inventoryControl/ProductionManagerPage.jsx";
import HomeProductPage from "./pages/eddeli/inventoryControl/HomeProduct.jsx";
import StoresManagerPage from "./pages/eddeli/inventoryControl/StoresManagerPage.jsx";
import StoresPublicPage from "./pages/eddeli/inventoryControl/StoresPublicPage.jsx";
import CatalogManagerPage from "./pages/eddeli/inventoryControl/CatalogManagerPage.jsx";
import ProductCompareGroupsPage from "./pages/eddeli/inventoryControl/ProductCompareGroupsPage.jsx";
import CatalogoPage from "./pages/eddeli/CatalogPage.jsx";
import AdTemplateEditor from "./pages/eddeli/AdTemplateEditor.jsx";
import EditorPage from "./pages/eddeli/photoshop/EditorPage.jsx";
import ProductTemplateStudio from "./pages/eddeli/photoshop/ProductTemplateStudio.jsx";
import EditorTemplatesView from "./pages/eddeli/photoshop/EditorTemplatesView.jsx";
import CajaPage from "./pages/eddeli/CajaPage.jsx";
import TurnoPage from "./pages/eddeli/TurnoPage.jsx";
import TurnoSupervisionPage from "./pages/eddeli/TurnoSupervisionPage.jsx";
import TareasPage from "./pages/eddeli/TareasPage.jsx";
import FacturacionPage from "./pages/eddeli/FacturacionPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import InfoPage from "./pages/InfoPage.jsx";
import DonacionesPage from "./pages/DonacionesPage.jsx";
import PanelControlPage from "./pages/PanelControlPage.jsx";
import NotificationProgramsPage from "./pages/NotificationProgramsPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import CuentasPage from "./pages/CuentasPage.jsx";
import RolesPage from "./pages/RolesPage.jsx";
import ComandosPage from "./pages/ComandosPage.jsx";
import BackupsPage from "./pages/BackupsPage.jsx";
import LogsPage from "./pages/LogsPage.jsx";
import ImgManagerPage from "./pages/ImgManagerPage.jsx";
import FileManagerPage from "./pages/FileManagerPage.jsx";
import PublicidadCampaignsPage from "./pages/eddeli/publicidad/PublicidadCampaignsPage.jsx";
import PublicidadCampaignEditorPage from "./pages/eddeli/publicidad/PublicidadCampaignEditorPage.jsx";
import PublicidadPlayerPage from "./pages/eddeli/publicidad/PublicidadPlayerPage.jsx";
import PublicidadTvPlayerPage from "./pages/eddeli/publicidad/PublicidadTvPlayerPage.jsx";
import PublicidadTvDevicePlayerPage from "./pages/eddeli/publicidad/PublicidadTvDevicePlayerPage.jsx";
import PublicidadDevicesPage from "./pages/eddeli/publicidad/PublicidadDevicesPage.jsx";
import SubscriptionExpiredPage from "./pages/SubscriptionExpiredPage.jsx";
import NoSubscriptionPage from "./pages/NoSubscriptionPage.jsx";

const AUTH_ROLES = [
  "Estudiante",
  "Administrador",
  "Programador",
  "Empresa",
  "Profesional",
  "Empleado",
  "Doctor/a",
  "Enfermero/a",
  "Pasante",
  "Moderador",
];

import Subify from "subify";

Subify.configure({
  apiKey: import.meta.env.VITE_SUBSCRIPTION_API_KEY,
});

export default function App() {
  return (
    <AuthProvider>
      <div id="sale-receipt-print-root" aria-hidden="true" />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Reproductor TV kiosco — sin NavBar ni login (APK Panadería TV / box HDMI) */}
        <Route
          path="/tv/device/:deviceId"
          element={<PublicidadTvDevicePlayerPage />}
        />
        <Route path="/tv/:campaignId" element={<PublicidadTvPlayerPage />} />

        <Route element={<NavBar />}>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/home" element={<HomeLogout />} />
          </Route>
          <Route
            path="/subscription-expired"
            element={<SubscriptionExpiredPage />}
          />
          <Route path="/no-subscription" element={<NoSubscriptionPage />} />
          <Route path="/catalogo" element={<CatalogoPage />} />
          <Route path="/punto_venta" element={<StoresPublicPage />} />

          <Route element={<ProtectedRoute requiredRol={AUTH_ROLES} />}>
            <Route path="/" element={<DashBoardPage />} />
            <Route path="/inicio" element={<HomeLogout />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/info" element={<InfoPage />} />
            <Route path="/donaciones" element={<DonacionesPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredRol={["Programador"]} />}>
            <Route path="/comandos" element={<ComandosPage />} />
            <Route path="/backups" element={<BackupsPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/img" element={<ImgManagerPage />} />
            <Route path="/file" element={<FileManagerPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                requiredRol={["Administrador", "Programador", "Empleado"]}
              />
            }
          >
            <Route path="/caja" element={<CajaPage />} />
            <Route path="/turno" element={<TurnoPage />} />
            <Route path="/tareas" element={<TareasPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute requiredRol={["Administrador", "Programador"]} />
            }
          >
            <Route path="/facturacion" element={<FacturacionPage />} />
            <Route
              path="/turno/supervision"
              element={<TurnoSupervisionPage />}
            />
            <Route path="/panel_control" element={<PanelControlPage />} />
            {/* Ruta reservada; menú oculto hasta API backend (NotificationProgramsPage) */}
            <Route
              path="/notification-programs"
              element={<NotificationProgramsPage />}
            />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/cuentas" element={<CuentasPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/backery" element={<CatalogoPage />} />
            <Route path="/catalog_manager" element={<CatalogManagerPage />} />
            <Route
              path="/compare_groups"
              element={<ProductCompareGroupsPage />}
            />
            {/* —— Módulo Diseño Promocional (editor tipo Photoshop + plantillas) —— */}
            <Route path="/diseno-promocional/editor" element={<EditorPage />} />
            <Route
              path="/diseno-promocional/vista"
              element={<ProductTemplateStudio />}
            />
            <Route
              path="/diseno-promocional/plantillas"
              element={<EditorTemplatesView />}
            />
            <Route path="/editor/:id?" element={<EditorPage />} />
            <Route path="/publicity_edit" element={<AdTemplateEditor />} />
            {/* —— Módulo Publicidad (campañas y reproductor para pantallas digitales) —— */}
            <Route path="/publicidad" element={<PublicidadCampaignsPage />} />
            <Route
              path="/publicidad/dispositivos"
              element={<PublicidadDevicesPage />}
            />
            <Route
              path="/publicidad/campanas/nueva"
              element={<PublicidadCampaignEditorPage />}
            />
            <Route
              path="/publicidad/campanas/:id"
              element={<PublicidadCampaignEditorPage />}
            />
            <Route
              path="/publicidad/reproductor/:campaignId?"
              element={<PublicidadPlayerPage />}
            />
            {/* Diseño Promocional — rutas legacy */}
            <Route
              path="/editorDefault"
              element={<Navigate to="/diseno-promocional/editor" replace />}
            />
            <Route
              path="/templates"
              element={<Navigate to="/diseno-promocional/plantillas" replace />}
            />
            <Route path="/inventory/products" element={<ProductsPage />} />
            <Route path="/inventory/categories" element={<CategoryPage />} />
            <Route path="/inventory/tramos" element={<TramosPage />} />
            <Route path="/inventory/units" element={<UnitPage />} />
            <Route path="/inventory/movement" element={<MovementPage />} />
            <Route path="/inventory/recipes" element={<RecipePage />} />
            <Route
              path="/inventory/insumos"
              element={<GenericIngredientsPage />}
            />
            <Route path="/inventory/orders" element={<OrderPage />} />
            <Route path="/inventory/customers" element={<CustomerPage />} />
            <Route path="/inventory/suppliers" element={<SupplierPage />} />
            <Route path="/inventory/finance" element={<FinancePage />} />
            <Route
              path="/inventory/collections"
              element={<CollectionsPage />}
            />
            <Route
              path="/inventory/prestamos-deudas"
              element={<LoansDebtsPage />}
            />
            <Route
              path="/inventory/gastos-recurrentes"
              element={<RecurringExpensesPage />}
            />
            <Route
              path="/inventory/production"
              element={<ProductionManagerPage />}
            />
            <Route
              path="/inventory/productos-destacados"
              element={<HomeProductPage />}
            />
            <Route
              path="/inventory/puntos-venta"
              element={<StoresManagerPage />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AuthProvider>
  );
}
