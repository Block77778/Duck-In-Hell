/**
 * Creates a simple token transfer transaction for testing with Phantom
 */
export async function createSimpleTokenTransfer(
  connection: any,
  senderPublicKey: any,
  recipientAddress: string,
  tokenMintAddress: string,
  amount: number,
) {
  console.log("Creating simple token transfer with parameters:")
  console.log("- Sender:", senderPublicKey.toString())
  console.log("- Recipient:", recipientAddress)
  console.log("- Token Mint:", tokenMintAddress)
  console.log("- Amount:", amount)

  // Import necessary modules
  const { PublicKey, Transaction } = await import("@solana/web3.js")
  const { createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } =
    await import("@solana/spl-token")

  // Convert addresses to PublicKey objects
  const tokenMint = new PublicKey(tokenMintAddress)
  const recipientPublicKey = new PublicKey(recipientAddress)

  // Get the sender's token account
  const senderTokenAccount = await getAssociatedTokenAddress(tokenMint, senderPublicKey)
  console.log("- Sender token account:", senderTokenAccount.toString())

  // Get the recipient's token account
  const recipientTokenAccount = await getAssociatedTokenAddress(tokenMint, recipientPublicKey)
  console.log("- Recipient token account:", recipientTokenAccount.toString())

  // Check if sender token account exists and has sufficient balance
  try {
    const senderAccount = await getAccount(connection, senderTokenAccount)
    const senderBalance = Number(senderAccount.amount)
    console.log(`- Sender token balance: ${senderBalance} (raw value)`)

    if (senderBalance < amount) {
      console.error(`⚠️ INSUFFICIENT BALANCE: Sender has ${senderBalance} tokens but trying to send ${amount} tokens`)
    }
  } catch (error) {
    console.error("⚠️ ERROR: Sender token account does not exist or cannot be accessed:", error)
    throw new Error("Sender token account not found. Please make sure you have tokens in your wallet.")
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
  transaction.add(
    createTransferInstruction(
      senderTokenAccount, // source
      recipientTokenAccount, // destination
      senderPublicKey, // owner
      amount, // amount with decimals
    ),
  )

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash
  transaction.lastValidBlockHeight = lastValidBlockHeight
  transaction.feePayer = senderPublicKey

  console.log("- Transaction created successfully")
  console.log("- Instructions:", transaction.instructions.length)

  return transaction
}

