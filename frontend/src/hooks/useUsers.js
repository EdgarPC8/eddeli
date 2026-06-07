import { useEffect, useState } from "react";
import { getUsersRequest } from "../api/userRequest";

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const data = await getUsersRequest();
      setUsers(data.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { users, isLoading, fetchUsers };
};
