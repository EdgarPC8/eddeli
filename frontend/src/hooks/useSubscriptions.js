//export { useSubscriptions } from "../context/SubscriptionContext.jsx";
//

import { useEffect, useState } from "react";
import Subscription from "../sdk/Subscription";

export const useSubscriptions = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [expired, setExpired] = useState(false);

  const fetchSub = async () => {
    const { error, data } = await Subscription.getSubscriptionInfo();
    if (error) {
      console.error(error);
      return;
    }
    const expireDate = new Date(data.subscription.expires_at);
    const now = new Date();

    setExpired(now > expireDate);

    setSubscription(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSub();
  }, []);

  return { isLoading, subscription, expired };
};
