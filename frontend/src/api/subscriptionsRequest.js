import axios, { authHeaders } from "./axios.js";

const auth = () => authHeaders();

export const checkSubscription = () => axios.get("/subscriptions/check", auth());

export const activateSubscription = (licenseKey) =>
  axios.post("/subscriptions/activate", { license: licenseKey }, auth());
