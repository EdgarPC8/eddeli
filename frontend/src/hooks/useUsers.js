import { useCallback, useEffect, useState } from "react";
import { getUsersRequest } from "../api/userRequest";

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getUsersRequest();
      const raw = res?.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.rows)
          ? raw.rows
          : Array.isArray(raw?.data)
            ? raw.data
            : [];
      setUsers(list);
    } catch (error) {
      console.error("useUsers:", error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, isLoading, fetchUsers };
};
