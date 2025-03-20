// Utility for managing RPC endpoints and handling rate limits

// List of public Solana RPC endpoints that can be used as fallbacks
export const PUBLIC_RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-api.projectserum.com",
  "https://rpc.ankr.com/solana",
]

// Track which endpoints have been rate limited
const rateLimitedEndpoints: Record<string, number> = {}

// Get the best available RPC endpoint
export function getBestRpcEndpoint(): string {
  // First try the environment variable
  const envEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL

  if (envEndpoint && !isEndpointRateLimited(envEndpoint)) {
    return envEndpoint
  }

  // Find the first non-rate-limited public endpoint
  for (const endpoint of PUBLIC_RPC_ENDPOINTS) {
    if (!isEndpointRateLimited(endpoint)) {
      return endpoint
    }
  }

  // If all endpoints are rate limited, use the one that was rate limited longest ago
  const oldestRateLimitedEndpoint = Object.entries(rateLimitedEndpoints).sort(
    ([, timeA], [, timeB]) => timeA - timeB,
  )[0]

  if (oldestRateLimitedEndpoint) {
    return oldestRateLimitedEndpoint[0]
  }

  // Fallback to the first public endpoint
  return PUBLIC_RPC_ENDPOINTS[0]
}

// Mark an endpoint as rate limited
export function markEndpointRateLimited(endpoint: string): void {
  rateLimitedEndpoints[endpoint] = Date.now()
  console.log(`Marked endpoint as rate limited: ${endpoint}`)
}

// Check if an endpoint is currently rate limited
export function isEndpointRateLimited(endpoint: string): boolean {
  const rateLimitTime = rateLimitedEndpoints[endpoint]
  if (!rateLimitTime) return false

  // Consider an endpoint rate limited for 5 minutes
  const rateLimitDuration = 5 * 60 * 1000 // 5 minutes
  return Date.now() - rateLimitTime < rateLimitDuration
}

// Clear rate limit status for all endpoints
export function clearAllRateLimits(): void {
  Object.keys(rateLimitedEndpoints).forEach((key) => {
    delete rateLimitedEndpoints[key]
  })
  console.log("Cleared all RPC endpoint rate limits")
}

