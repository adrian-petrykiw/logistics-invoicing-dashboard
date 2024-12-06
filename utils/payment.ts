export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  account_credit: "Available Credit",
  ach: "ACH Transfer",
  wire: "Wire Transfer",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
};

export const formatPaymentMethod = (method: string) => {
  return PAYMENT_METHOD_LABELS[method] || method;
};
