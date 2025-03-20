import type { Transaction } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"

/**
 * Inspects a transaction and returns detailed information for debugging
 * @param transaction Transaction to inspect
 * @returns Object with detailed transaction information
 */
export function inspectTransaction(transaction: Transaction): {
  instructions: string[]
  signers: string[]
  recentBlockhash: string
  feePayer: string
} {
  // Extract instruction details
  const instructions = transaction.instructions.map((instr, index) => {
    const programId = instr.programId.toString()
    const accounts = instr.keys.map((key) => ({
      pubkey: key.pubkey.toString(),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    }))

    let type = "Unknown"
    if (programId === TOKEN_PROGRAM_ID.toString()) {
      // SPL Token Program
      if (accounts.length >= 3) {
        // Check data to determine instruction type
        const dataView = new Uint8Array(instr.data)
        if (dataView.length > 0) {
          const instructionType = dataView[0]
          if (instructionType === 3) {
            type = "SPL Token Transfer"
            // For token transfers, log source and destination
            if (accounts.length >= 2) {
              type += ` from ${accounts[0].pubkey.substring(0, 6)}... to ${accounts[1].pubkey.substring(0, 6)}...`
            }
          } else if (instructionType === 1) {
            type = "SPL Token Initialize Account"
          } else if (instructionType === 7) {
            type = "SPL Token Create Associated Token Account"
          } else {
            type = `SPL Token Instruction (${instructionType})`
          }
        }
      }
    } else if (programId === "11111111111111111111111111111111") {
      // System Program
      type = "System Program Call"
    } else if (programId === "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL") {
      type = "Associated Token Account Program"
    }

    return `Instruction ${index}: ${type} (Program: ${programId}, ${accounts.length} accounts)`
  })

  // Extract signer information
  const signers = transaction.signatures.map((sig) => (sig.publicKey ? sig.publicKey.toString() : "Unknown"))

  return {
    instructions,
    signers,
    recentBlockhash: transaction.recentBlockhash || "Not set",
    feePayer: transaction.feePayer ? transaction.feePayer.toString() : "Not set",
  }
}

/**
 * Prints transaction details to the console for debugging
 * @param transaction Transaction to debug
 */
export function debugTransaction(transaction: Transaction): void {
  const details = inspectTransaction(transaction)

  console.log("============= TRANSACTION DEBUG =============")
  console.log("Recent Blockhash:", details.recentBlockhash)
  console.log("Fee Payer:", details.feePayer)
  console.log("Signers:", details.signers)
  console.log("Instructions:")
  details.instructions.forEach((instr) => console.log(" -", instr))

  // Detailed instruction analysis
  console.log("Detailed Instruction Analysis:")
  transaction.instructions.forEach((instr, i) => {
    console.log(`Instruction ${i}:`)
    console.log("  Program ID:", instr.programId.toString())
    console.log("  Accounts:")
    instr.keys.forEach((key, j) => {
      console.log(
        `    ${j}: ${key.pubkey.toString()} (${key.isSigner ? "signer" : "not-signer"}, ${key.isWritable ? "writable" : "readonly"})`,
      )
    })

    // If it's a token transfer, try to decode the amount
    if (instr.programId.equals(TOKEN_PROGRAM_ID) && instr.data.length >= 9) {
      const dataView = new DataView(instr.data.buffer, instr.data.byteOffset, instr.data.byteLength)
      try {
        // Token transfers have instruction type 3 at byte 0, and amount as a u64 starting at byte 1
        if (instr.data[0] === 3) {
          // Read the u64 amount (8 bytes starting at position 1)
          const amountLow = dataView.getUint32(1, true)
          const amountHigh = dataView.getUint32(5, true)
          const amount = amountLow + amountHigh * 4294967296 // 2^32
          console.log(`    Token Transfer Amount: ${amount}`)
        }
      } catch (e) {
        console.log("    Could not decode token amount")
      }
    }

    console.log(
      `    Data (${instr.data.length} bytes): ${Buffer.from(instr.data).toString("hex").substring(0, 50)}${instr.data.length > 25 ? "..." : ""}`,
    )
  })

  console.log("============================================")
}

