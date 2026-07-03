class Subscription {
  apikey = null;
  #apiUrl =
    "https://aplicaciones.marianosamaniego.edu.ec/gestor-proyectos-negocios/api";

  configure({ apikey }) {
    this.apikey = apikey;
  }

  async activateSubscription({ licenseKey }) {
    try {
      const response = await fetch(`${this.#apiUrl}/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apikey}`,
        },
        body: JSON.stringify({
          license_key: licenseKey,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data);
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async getSubscriptionInfo() {
    try {
      if (!this.apikey) {
        throw new Error("No existe apiKey");
      }

      const response = await fetch(`${this.#apiUrl}/subscriptions/check`, {
        headers: {
          Authorization: `Bearer ${this.apikey}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data);
      }
      return { error: null, data };
    } catch (error) {
      return { error: error.message, data: null };
    }
  }
}

export default new Subscription();
