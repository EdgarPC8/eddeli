import { useEffect, useState } from "react";
import { getRolRequest } from "../api/accountRequest";

export const useRoles = () => {
  const [roles, setRoles] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = async () => {
    try {
      const req = await getRolRequest();
      setRoles(req.data);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  return { roles, isLoading };
};
