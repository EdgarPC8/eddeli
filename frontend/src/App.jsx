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
import UnitPage from "./pages/eddeli/inventoryControl/UnitPage.jsx";
import MovementPage from "./pages/eddeli/inventoryControl/MovementPage.jsx";
import RecipePage from "./pages/eddeli/inventoryControl/RecipePage.jsx";
import OrderPage from "./pages/eddeli/inventoryControl/OrderPage.jsx";
import CustomerPage from "./pages/eddeli/inventoryControl/CustomerPage.jsx";
import FinancePage from "./pages/eddeli/inventoryControl/FinancePage.jsx";
import CollectionsPage from "./pages/eddeli/inventoryControl/CollectionsPage.jsx";
import ProductionManagerPage from "./pages/eddeli/inventoryControl/ProductionManagerPage.jsx";
import HomeProductPage from "./pages/eddeli/inventoryControl/HomeProduct.jsx";
import StoresManagerPage from "./pages/eddeli/inventoryControl/StoresManagerPage.jsx";
import StoresPublicPage from "./pages/eddeli/inventoryControl/StoresPublicPage.jsx";
import CatalogManagerPage from "./pages/eddeli/inventoryControl/CatalogManagerPage.jsx";
import CatalogoPage from "./pages/eddeli/CatalogPage.jsx";
import AdTemplateEditor from "./pages/eddeli/AdTemplateEditor.jsx";
import EditorPage from "./pages/eddeli/photoshop/EditorPage.jsx";
import ProductTemplateStudio from "./pages/eddeli/photoshop/ProductTemplateStudio.jsx";
import EditorTemplatesView from "./pages/eddeli/photoshop/EditorTemplatesView.jsx";
import CajaPage from "./pages/eddeli/CajaPage.jsx";
import TurnoPage from "./pages/eddeli/TurnoPage.jsx";
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
import LogsPage from "./pages/LogsPage.jsx";
import ImgManagerPage from "./pages/ImgManagerPage.jsx";
import FileManagerPage from "./pages/FileManagerPage.jsx";

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

export default function App() {
  return (
    <AuthProvider>
      <div id="sale-receipt-print-root" aria-hidden="true" />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<NavBar />}>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/home" element={<HomeLogout />} />
          </Route>

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
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/img" element={<ImgManagerPage />} />
            <Route path="/file" element={<FileManagerPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredRol={["Administrador", "Programador", "Empleado"]} />}>
            <Route path="/caja" element={<CajaPage />} />
            <Route path="/turno" element={<TurnoPage />} />
            <Route path="/tareas" element={<TareasPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredRol={["Administrador", "Programador"]} />}>
            <Route path="/facturacion" element={<FacturacionPage />} />
            <Route path="/panel_control" element={<PanelControlPage />} />
            <Route path="/notification-programs" element={<NotificationProgramsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/cuentas" element={<CuentasPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/backery" element={<CatalogoPage />} />
            <Route path="/catalog_manager" element={<CatalogManagerPage />} />
            <Route path="/publicity_edit" element={<AdTemplateEditor />} />
            <Route path="/publicidad" element={<ProductTemplateStudio />} />
            <Route path="/editorDefault" element={<EditorPage />} />
            <Route path="/editor/:id?" element={<EditorPage />} />
            <Route path="/templates" element={<EditorTemplatesView />} />
            <Route path="/inventory/products" element={<ProductsPage />} />
            <Route path="/inventory/categories" element={<CategoryPage />} />
            <Route path="/inventory/units" element={<UnitPage />} />
            <Route path="/inventory/movement" element={<MovementPage />} />
            <Route path="/inventory/recipes" element={<RecipePage />} />
            <Route path="/inventory/orders" element={<OrderPage />} />
            <Route path="/inventory/customers" element={<CustomerPage />} />
            <Route path="/inventory/finance" element={<FinancePage />} />
            <Route path="/inventory/collections" element={<CollectionsPage />} />
            <Route path="/inventory/production" element={<ProductionManagerPage />} />
            <Route path="/inventory/productos-destacados" element={<HomeProductPage />} />
            <Route path="/inventory/puntos-venta" element={<StoresManagerPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AuthProvider>
  );
}
