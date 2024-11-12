import { Connection } from "@solana/web3.js";

async function confirmTransactionWithRetry(
  connection: Connection,
  signature: string,
  maxRetries = 5,
  initialDelay = 500 // 500ms initial delay
): Promise<boolean> {
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(
        `Confirmation attempt ${
          retryCount + 1
        } of ${maxRetries} for tx ${signature}`
      );

      // Get latest blockhash for each attempt
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");

      console.log(
        `Using blockhash ${blockhash} with last valid height ${lastValidBlockHeight}`
      );

      // Confirm transaction
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (!confirmation?.value?.err) {
        // Double-check transaction status
        const status = await connection.getSignatureStatus(signature);
        console.log(`Transaction status:`, status?.value);

        if (status?.value?.err) {
          throw new Error(`Transaction failed: ${status.value.err}`);
        }

        // Check confirmation status
        if (
          status?.value?.confirmationStatus === "confirmed" ||
          status?.value?.confirmationStatus === "finalized"
        ) {
          console.log(
            `Transaction confirmed successfully on attempt ${
              retryCount + 1
            } with status ${status.value.confirmationStatus}`
          );
          return true;
        }

        // If not confirmed but no error, continue retrying
        console.log(
          `Transaction not yet confirmed. Status: ${status?.value?.confirmationStatus}`
        );
      }

      // If we get here, increment retry count and wait before next attempt
      retryCount++;
      const delay = initialDelay * Math.pow(2, retryCount);
      console.log(`Waiting ${delay}ms before next confirmation attempt...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      console.error(`Error on confirmation attempt ${retryCount + 1}:`, error);

      // On last retry, do one final status check
      if (retryCount === maxRetries - 1) {
        try {
          console.log("Performing final status check...");
          const status = await connection.getSignatureStatus(signature);

          if (
            status?.value?.confirmationStatus === "confirmed" ||
            status?.value?.confirmationStatus === "finalized"
          ) {
            console.log(
              "Transaction found to be successful in final check with status:",
              status.value.confirmationStatus
            );
            return true;
          }

          console.log("Final status check result:", status?.value);
        } catch (finalCheckError) {
          console.error("Error in final status check:", finalCheckError);
        }
      }

      retryCount++;
      const delay = initialDelay * Math.pow(2, retryCount);
      console.log(`Error occurred. Waiting ${delay}ms before next attempt...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // If we've exhausted all retries, do one last status check
  try {
    const finalStatus = await connection.getSignatureStatus(signature);
    if (
      finalStatus?.value?.confirmationStatus === "confirmed" ||
      finalStatus?.value?.confirmationStatus === "finalized"
    ) {
      console.log(
        "Transaction found to be successful in last-chance check with status:",
        finalStatus.value.confirmationStatus
      );
      return true;
    }
    console.log("Last-chance status check result:", finalStatus?.value);
  } catch (error) {
    console.error("Error in last-chance status check:", error);
  }

  console.error(`Transaction confirmation failed after ${maxRetries} attempts`);
  throw new Error("Transaction confirmation failed after retries");
}

export { confirmTransactionWithRetry };
