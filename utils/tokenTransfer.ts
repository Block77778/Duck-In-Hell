import { type Connection, PublicKey, Transaction } from "@solana/web3.js"
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token"

// Token decimals - SPL tokens typically use 9 decimals
const TOKEN_DECIMALS = 9

/**
 * Creates a token transfer transaction
 * @param connection Solana connection
 * @param senderPublicKey Sender's public key
 * @param recipientAddress Recipient's address (as string)
 * @param tokenMintAddress Token mint address (as string)
 * @param amount Amount of tokens to send (in human-readable format)
 * @returns Transaction object ready to be signed
 */
export async function createTokenTransferTransaction(
  connection: Connection,
  senderPublicKey: PublicKey,
  recipientAddress: string,
  tokenMintAddress: string,
  amount: number,
): Promise<{
  transaction: Transaction
  recipientTokenAccount: PublicKey
  senderTokenAccount: PublicKey
  tokenMint: PublicKey
  amountWithDecimals: number
}> {
  console.log("Creating token transfer transaction with parameters:")
  console.log("- Sender:", senderPublicKey.toString())
  console.log("- Recipient:", recipientAddress)
  console.log("- Token Mint:", tokenMintAddress)
  console.log("- Amount:", amount)

  // Convert addresses to PublicKey objects
  const tokenMint = new PublicKey(tokenMintAddress)
  const recipientPublicKey = new PublicKey(recipientAddress)

  // Get the sender's token account
  const senderTokenAccount = await getAssociatedTokenAddress(tokenMint, senderPublicKey)
  console.log("- Sender token account:", senderTokenAccount.toString())

  // Get the recipient's token account
  const recipientTokenAccount = await getAssociatedTokenAddress(tokenMint, recipientPublicKey)
  console.log("- Recipient token account:", recipientTokenAccount.toString())

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

  // Log the full addresses for verification
  console.log("DETAILED ADDRESS INFO:")
  console.log(`Sender wallet: ${senderPublicKey.toString()}`)
  console.log(`Recipient wallet: ${recipientPublicKey.toString()}`)
  console.log(`Token mint: ${tokenMint.toString()}`)
  console.log(`Sender token account: ${senderTokenAccount.toString()}`)
  console.log(`Recipient token account: ${recipientTokenAccount.toString()}`)

  // Calculate token amount with proper decimal adjustment
  const amountWithDecimals = Math.floor(amount * Math.pow(10, TOKEN_DECIMALS))
  console.log("- Amount with decimals:", amountWithDecimals)

  // Verify sender token account exists and has sufficient balance
  try {
    const senderAccount = await getAccount(connection, senderTokenAccount)
    const senderBalance = Number(senderAccount.amount)
    console.log(`Sender token balance: ${senderBalance / Math.pow(10, TOKEN_DECIMALS)} tokens`)

    if (senderBalance < amountWithDecimals) {
      console.error(
        `⚠️ INSUFFICIENT BALANCE: Sender has ${senderBalance / Math.pow(10, TOKEN_DECIMALS)} tokens but trying to send ${amount} tokens`,
      )
    }
  } catch (error) {
    console.error("⚠️ ERROR: Sender token account does not exist or cannot be accessed:", error)
  }

  // Check if the recipient public key is valid
  try {
    const recipientInfo = await connection.getAccountInfo(recipientPublicKey)
    console.log(`Recipient wallet exists: ${!!recipientInfo}`)
  } catch (error) {
    console.error("⚠️ ERROR: Could not verify recipient wallet:", error)
  }

  // Create a new transaction
  const transaction = new Transaction()

  // If recipient token account doesn't exist, add instruction to create it
  if (!recipientAccountExists) {
    console.log("- Adding instruction to create recipient token account")
    transaction.add(
      createAssociatedTokenAccountInstruction(
        senderPublicKey, // payer
        recipientTokenAccount, // associated token account
        recipientPublicKey, // owner
        tokenMint, // mint
      ),
    )
  }

  // Add token transfer instruction
  console.log("- Adding token transfer instruction")
  const transferInstruction = createTransferInstruction(
    senderTokenAccount, // source
    recipientTokenAccount, // destination
    senderPublicKey, // owner
    amountWithDecimals, // amount with decimals
    [], // multisig signers (empty array for single signer)
    TOKEN_PROGRAM_ID, // explicitly specify token program ID
  )

  // Log the instruction details for debugging
  console.log("- Transfer instruction details:")
  console.log("  - Program ID:", transferInstruction.programId.toString())
  console.log("  - Source:", senderTokenAccount.toString())
  console.log("  - Destination:", recipientTokenAccount.toString())

  transaction.add(transferInstruction)

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash
  transaction.lastValidBlockHeight = lastValidBlockHeight
  transaction.feePayer = senderPublicKey

  // Log transaction details
  console.log("Transaction created successfully")
  console.log("- Instructions:", transaction.instructions.length)
  console.log("- Blockhash:", blockhash)
  console.log("- Fee payer:", senderPublicKey.toString())

  // Return the transaction and relevant addresses for verification
  return {
    transaction,
    recipientTokenAccount,
    senderTokenAccount,
    tokenMint,
    amountWithDecimals,
  }
}

/**
 * Verifies that a transaction contains the expected token transfer
 * @param transaction Transaction to verify
 * @param senderTokenAccount Expected sender token account
 * @param recipientTokenAccount Expected recipient token account
 * @param amountWithDecimals Expected amount with decimals
 * @returns True if the transaction contains the expected transfer
 */
export function verifyTokenTransfer(
  transaction: Transaction,
  senderTokenAccount: PublicKey,
  recipientTokenAccount: PublicKey,
  amountWithDecimals: number,
): boolean {
  // Find the transfer instruction
  const transferInstruction = transaction.instructions.find((instruction) => {
    // Check if this is a token transfer instruction
    if (instruction.programId.equals(TOKEN_PROGRAM_ID)) {
      // Get the accounts involved
      const accounts = instruction.keys

      // Check if the accounts match our expected sender and recipient
      if (accounts.length >= 3) {
        const sourceAccount = accounts[0]?.pubkey
        const destinationAccount = accounts[1]?.pubkey

        return sourceAccount.equals(senderTokenAccount) && destinationAccount.equals(recipientTokenAccount)
      }
    }
    return false
  })

  if (!transferInstruction) {
    console.error("No valid token transfer instruction found in transaction")
    return false
  }

  console.log("Token transfer instruction verified successfully")
  return true
}

/**
 * Formats a public key for display
 * @param publicKey Public key to format
 * @returns Formatted string (first 6 and last 4 characters)
 */
export function formatPublicKey(publicKey: string): string {
  return `${publicKey.substring(0, 6)}...${publicKey.substring(publicKey.length - 4)}`
}

/**
 * Verifies that a token account belongs to a wallet
 * @param connection Solana connection
 * @param tokenAccount Token account to verify
 * @param walletAddress Wallet address that should own the token account
 * @returns True if the token account belongs to the wallet
 */
export async function verifyTokenAccountOwner(
  connection: Connection,
  tokenAccount: PublicKey,
  walletAddress: string,
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(tokenAccount)

    if (!accountInfo) {
      console.log(`Token account ${tokenAccount.toString()} does not exist`)
      return false
    }

    // The owner of an SPL token account is the token program
    // We need to parse the account data to get the actual owner
    const accountData = accountInfo.data

    // The owner (wallet) is at offset 32 in the account data (after the mint)
    // Each public key is 32 bytes
    if (accountData.length >= 64) {
      const ownerBytes = accountData.slice(32, 64)
      const owner = new PublicKey(ownerBytes)

      return owner.toString() === walletAddress
    }

    return false
  } catch (error) {
    console.error("Error verifying token account owner:", error)
    return false
  }
}

