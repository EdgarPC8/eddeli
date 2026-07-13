import { useEffect, useState } from "react";
import Subify from "subify";

export const usePlans = () => {
  const [plans, setPlans] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlans = async () => {
    const { error, data } = await Subify.getPlans();
    console.log(data);

    if (error) {
      console.error(error);
      setIsLoading(false);
      return;
    }

    setPlans(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return { plans, isLoading };
};
