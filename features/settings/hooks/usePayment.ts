import axios from "axios";

export const usePayment = () => {
  const checkPaymentStatus = async (partnerUserId: string) => {
    try {
      const response = await axios.get(
        `https://api.developer.coinbase.com/onramp/v1/buy/user/${partnerUserId}/transactions`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_COINBASE_APP_ID}`,
          },
        }
      );
      return (
        response.data.transactions[0]?.status ===
        "ONRAMP_TRANSACTION_STATUS_SUCCESS"
      );
    } catch (error) {
      console.error("Failed to check payment status:", error);
      return false;
    }
  };

  return { checkPaymentStatus };
};
