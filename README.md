# EdDeli (Raptor)

- **Backend:** `backend/` — API `eddeliapi`, base `softed`, puerto `3001`
- **Frontend (desarrollo):** compartido en `AppsWeb/raptor/frontend`

## Desarrollo

```bash
# Terminal 1 — API EdDeli
cd AppsWeb/eddeli/backend
npm run dev

# Terminal 2 — interfaz compartida
cd AppsWeb/raptor/frontend
npm run dev:eddeli
# http://localhost:5173/eddeli/ · proxy → eddeliapi:3001
```

## Configuración con el gestor

El backend recibe los permisos y el estado de suscripción desde el gestor en:

```text
PUT /eddeliapi/subscription/entitlement
```

En `backend/.env`, `GESTOR_SYNC_SECRET` debe coincidir con el secreto de
EdDeli configurado en el gestor. El pull opcional apunta a
`https://aplicaciones.marianosamaniego.edu.ec/raptorsolutions/api`. El archivo
`.env` es exclusivo del servidor y no se versiona.

## Git y despliegue

Desde el equipo de desarrollo:

```bash
cd AppsWeb/raptor/frontend
npm run git-push-eddeli -- "descripción del cambio"
```

Para publicar las tres apps:

```bash
npm run git-push-apps -- "cambio compartido"
```

En el servidor:

```bash
cd /ruta/a/eddeli
git status
git pull
```

Ejecutá `git pull` únicamente con el árbol limpio. La configuración debe ir en
`backend/.env`, nunca mediante cambios directos a archivos versionados.
