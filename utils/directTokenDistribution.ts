import { type Connection, PublicKey, Transaction } from "@solana/web3.js"
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token"

// Token decimals - SPL tokens typically use 9 decimals
const TOKEN_DECIMALS = 9

/**
 * Simplified function to distribute tokens to a recipient
 */
export async function distributeTokens(
  connection: Connection,
  senderWallet: PublicKey,
  recipientWallet: string,
  tokenMint: string,
  amount: number,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>,
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    console.log("Starting direct token distribution:")
    console.log(`- Sender: ${senderWallet.toString()}`)
    console.log(`- Recipient: ${recipientWallet}`)
    console.log(`- Token Mint: ${tokenMint}`)
    console.log(`- Amount: ${amount}`)

    // Convert string addresses to PublicKey objects
    const mintPubkey = new PublicKey(tokenMint)
    const recipientPubkey = new PublicKey(recipientWallet)

    // Get token accounts
    const senderTokenAccount = await getAssociatedTokenAddress(mintPubkey, senderWallet)
    const recipientTokenAccount = await getAssociatedTokenAddress(mintPubkey, recipientPubkey)

    console.log(`- Sender token account: ${senderTokenAccount.toString()}`)
    console.log(`- Recipient token account: ${recipientTokenAccount.toString()}`)

    // Check if sender has enough tokens
    try {
      const senderAccount = await getAccount(connection, senderTokenAccount)
      const senderBalance = Number(senderAccount.amount)
      const amountInSmallestUnits = Math.floor(amount * Math.pow(10, TOKEN_DECIMALS))

      console.log(`- Sender balance: ${senderBalance / Math.pow(10, TOKEN_DECIMALS)} tokens`)
      console.log(`- Amount to send: ${amount} tokens (${amountInSmallestUnits} in smallest units)`)

      if (senderBalance < amountInSmallestUnits) {
        return {
          success: false,
          error: `Insufficient balance. Have: ${senderBalance / Math.pow(10, TOKEN_DECIMALS)}, Need: ${amount}`,
        }
      }
    } catch (error) {
      console.error("Error checking sender token account:", error)
      return { success: false, error: "Could not verify sender token account" }
    }

    // Check if recipient token account exists
    let recipientAccountExists = false
    try {
      await getAccount(connection, recipientTokenAccount)
      recipientAccountExists = true
      console.log("- Recipient token account exists")
    } catch (error) {
      recipientAccountExists = false
      console.log("- Recipient token account does not exist, will create it")
    }

    // Create transaction
    const transaction = new Transaction()

    // If recipient token account doesn't exist, add instruction to create it
    if (!recipientAccountExists) {
      console.log("- Adding instruction to create recipient token account")
      transaction.add(
        createAssociatedTokenAccountInstruction(
          senderWallet, // payer
          recipientTokenAccount, // associated token account
          recipientPubkey, // owner
          mintPubkey, // mint
        ),
      )
    }

    // Add token transfer instruction
    const amountInSmallestUnits = Math.floor(amount * Math.pow(10, TOKEN_DECIMALS))
    console.log(`- Adding transfer instruction for ${amountInSmallestUnits} tokens (smallest units)`)

    transaction.add(
      createTransferInstruction(
        senderTokenAccount, // source
        recipientTokenAccount, // destination
        senderWallet, // owner
        amountInSmallestUnits, // amount
      ),
    )

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash("confirmed")
    transaction.recentBlockhash = blockhash
    transaction.feePayer = senderWallet

    console.log("- Transaction created, signing...")

    // Sign and send transaction
    try {
      // Sign the transaction
      const signedTransaction = await signTransaction(transaction)
      console.log("- Transaction signed successfully")

      // Send the transaction
      const signature = await sendTransaction(signedTransaction, connection)
      console.log(`- Transaction sent with signature: ${signature}`)

      // Wait for confirmation
      console.log("- Waiting for confirmation...")
      const confirmation = await connection.confirmTransaction(signature, "confirmed")

      if (confirmation.value.err) {
        console.error("- Transaction confirmed but has errors:", confirmation.value.err)
        return { success: false, signature, error: "Transaction confirmed with errors" }
      }

      console.log("- Transaction confirmed successfully!")
      return { success: true, signature }
    } catch (error) {
      console.error("Error signing or sending transaction:", error)
      return {
        success: false,
        error: `Error signing or sending transaction: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  } catch (error) {
    console.error("Error in distributeTokens:", error)
    return {
      success: false,
      error: `Error in distributeTokens: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Alternative method to distribute tokens using a simpler approach
 */
export async function simplifiedTokenDistribution(
  connection: Connection,
  senderWallet: PublicKey,
  recipientWallet: string,
  tokenMint: string,
  amount: number,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>,
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    console.log("Starting simplified token distribution:")
    console.log(`- Sender: ${senderWallet.toString()}`)
    console.log(`- Recipient: ${recipientWallet}`)
    console.log(`- Token Mint: ${tokenMint}`)
    console.log(`- Amount: ${amount}`)

    // Convert string addresses to PublicKey objects
    const mintPubkey = new PublicKey(tokenMint)
    const recipientPubkey = new PublicKey(recipientWallet)

    // Get token accounts
    const senderTokenAccount = await getAssociatedTokenAddress(mintPubkey, senderWallet)

    // For this simplified approach, we'll create two separate transactions if needed

    // 1. First check if recipient token account exists and create it if needed
    const recipientTokenAccount = await getAssociatedTokenAddress(mintPubkey, recipientPubkey)

    console.log(`- Sender token account: ${senderTokenAccount.toString()}`)
    console.log(`- Recipient token account: ${recipientTokenAccount.toString()}`)

    let recipientAccountExists = false
    try {
      await getAccount(connection, recipientTokenAccount)
      recipientAccountExists = true
      console.log("- Recipient token account exists")
    } catch (error) {
      recipientAccountExists = false
      console.log("- Recipient token account does not exist, will create it first")

      // Create a separate transaction just to create the token account
      if (!recipientAccountExists) {
        try {
          const createAccountTx = new Transaction()
          createAccountTx.add(
            createAssociatedTokenAccountInstruction(
              senderWallet, // payer
              recipientTokenAccount, // associated token account
              recipientPubkey, // owner
              mintPubkey, // mint
            ),
          )

          const { blockhash } = await connection.getLatestBlockhash("confirmed")
          createAccountTx.recentBlockhash = blockhash
          createAccountTx.feePayer = senderWallet

          console.log("- Signing account creation transaction...")
          const signedCreateTx = await signTransaction(createAccountTx)

          console.log("- Sending account creation transaction...")
          const createSignature = await sendTransaction(signedCreateTx, connection)

          console.log(`- Account creation transaction sent: ${createSignature}`)
          await connection.confirmTransaction(createSignature, "confirmed")
          console.log("- Account creation confirmed!")

          // Now the account should exist
          recipientAccountExists = true
        } catch (error) {
          console.error("Error creating recipient token account:", error)
          return {
            success: false,
            error: `Error creating recipient token account: ${error instanceof Error ? error.message : String(error)}`,
          }
        }
      }
    }

    // 2. Now send the tokens in a separate transaction
    try {
      const transferTx = new Transaction()

      // Calculate amount with decimals
      const amountInSmallestUnits = Math.floor(amount * Math.pow(10, TOKEN_DECIMALS))
      console.log(`- Adding transfer instruction for ${amountInSmallestUnits} tokens (smallest units)`)

      transferTx.add(
        createTransferInstruction(
          senderTokenAccount, // source
          recipientTokenAccount, // destination
          senderWallet, // owner
          amountInSmallestUnits, // amount
        ),
      )

      const { blockhash } = await connection.getLatestBlockhash("confirmed")
      transferTx.recentBlockhash = blockhash
      transferTx.feePayer = senderWallet

      console.log("- Signing transfer transaction...")
      const signedTransferTx = await signTransaction(transferTx)

      console.log("- Sending transfer transaction...")
      const transferSignature = await sendTransaction(signedTransferTx, connection)

      console.log(`- Transfer transaction sent: ${transferSignature}`)
      await connection.confirmTransaction(transferSignature, "confirmed")
      console.log("- Transfer confirmed!")

      return { success: true, signature: transferSignature }
    } catch (error) {
      console.error("Error sending tokens:", error)
      return {
        success: false,
        error: `Error sending tokens: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  } catch (error) {
    console.error("Error in simplifiedTokenDistribution:", error)
    return {
      success: false,
      error: `Error in simplifiedTokenDistribution: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

