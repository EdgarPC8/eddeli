import { subscription } from "../config/subscription-api.js";

const FETCH_TIMEOUT_MS = 8_000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export const check = async (_, res) => {
  if (!subscription.apikey) {
    return res.status(500).json({
      message: "SUBSCRIPTION_API_KEY no configurada en el servidor",
    });
  }

  try {
    const response = await fetchWithTimeout(`${subscription.api}/subscriptions/check`, {
      headers: {
        Authorization: `Bearer ${subscription.apikey}`,
      },
    });
    if (!response.ok) {
      return res.status(502).json({
        message: "Error al consultar el gestor central",
      });
    }

    const data = await response.json();
    res.json(data);
  } catch {
    res.status(502).json({
      message: "No se pudo conectar con el gestor central",
    });
  }
};

export const activate = async (req, res) => {
  if (!subscription.apikey) {
    return res.status(500).json({
      message: "SUBSCRIPTION_API_KEY no configurada en el servidor",
    });
  }

  try {
    const { license: licenseKey } = req.body;

    const response = await fetch(`${subscription.api}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${subscription.apikey}`,
      },
      body: JSON.stringify({
        license_key: licenseKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    res.json(data);
  } catch {
    res.status(502).json({
      message: "No se pudo conectar con el gestor central",
    });
  }
};
