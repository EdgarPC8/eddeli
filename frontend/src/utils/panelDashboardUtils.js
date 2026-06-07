export const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export function buildRangeParams(rangeKey) {
  if (rangeKey === "all") return {};
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - Number(rangeKey));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export const RANGE_OPTIONS = [
  { key: "7", label: "7 días" },
  { key: "30", label: "30 días" },
  { key: "90", label: "90 días" },
  { key: "all", label: "Todo" },
];
