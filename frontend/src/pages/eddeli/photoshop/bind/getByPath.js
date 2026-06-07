export const getByPath = (obj, path) => {
    try {
      return String(path || "")
        .split(".")
        .reduce((acc, k) => acc?.[k], obj);
    } catch {
      return undefined;
    }
  };
  