import { type Connection, PublicKey } from "@solana/web3.js"
import { getAccount } from "@solana/spl-token"

/**
 * Tests token transfer functionality without actually sending tokens
 * @param connection Solana connection
 * @param senderAddress Sender wallet address
 * @param recipientAddress Recipient wallet address
 * @param tokenMintAddress Token mint address
 */
export async function testTokenTransfer(
  connection: Connection,
  senderAddress: string,
  recipientAddress: string,
  tokenMintAddress: string,
): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    console.log("Testing token transfer setup:")
    console.log("- Sender:", senderAddress)
    console.log("- Recipient:", recipientAddress)
    console.log("- Token:", tokenMintAddress)

    // Convert addresses to PublicKey objects
    const senderPublicKey = new PublicKey(senderAddress)
    const recipientPublicKey = new PublicKey(recipientAddress)
    const tokenMint = new PublicKey(tokenMintAddress)

    // Import necessary functions
    const { getAssociatedTokenAddress } = await import("@solana/spl-token")

    // Get the sender's token account
    const senderTokenAccount = await getAssociatedTokenAddress(tokenMint, senderPublicKey)
    console.log("- Sender token account:", senderTokenAccount.toString())

    // Get the recipient's token account address
    const recipientTokenAccount = await getAssociatedTokenAddress(tokenMint, recipientPublicKey)
    console.log("- Recipient token account:", recipientTokenAccount.toString())

    // Check if sender token account exists
    let senderAccountExists = false
    let senderBalance = 0
    try {
      const account = await getAccount(connection, senderTokenAccount)
      senderAccountExists = true
      senderBalance = Number(account.amount)
      console.log("- Sender account exists with balance:", senderBalance)
    } catch (error) {
      console.log("- Sender token account does not exist")
    }

    // Check if recipient token account exists
    let recipientAccountExists = false
    let recipientBalance = 0
    try {
      const account = await getAccount(connection, recipientTokenAccount)
      recipientAccountExists = true
      recipientBalance = Number(account.amount)
      console.log("- Recipient account exists with balance:", recipientBalance)
    } catch (error) {
      console.log("- Recipient token account does not exist, would be created")
    }

    return {
      success: true,
      message: "Token transfer setup is valid",
      details: {
        senderAccountExists,
        senderBalance,
        recipientAccountExists,
        recipientBalance,
        senderTokenAccount: senderTokenAccount.toString(),
        recipientTokenAccount: recipientTokenAccount.toString(),
      },
    }
  } catch (error) {
    console.error("Error testing token transfer:", error)
    return {
      success: false,
      message: `Error testing token transfer: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

