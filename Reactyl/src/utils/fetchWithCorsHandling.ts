/**
 * Fetch wrapper that silently handles CORS errors
 * Returns null on CORS errors instead of throwing, allowing the app to continue
 */
export async function fetchWithCorsHandling(
  url: string,
  options?: RequestInit
): Promise<Response | null> {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error: any) {
    // Silently handle CORS errors - don't log or throw
    // Check if it's a CORS/network error
    if (
      error?.name === 'TypeError' ||
      error?.message?.includes('CORS') ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('NetworkError') ||
      error?.message?.includes('network')
    ) {
      // CORS error - return null silently
      return null;
    }
    // For other errors, still return null but could log if needed
    return null;
  }
}

/**
 * Fetch JSON with CORS error handling
 * Returns null on CORS errors or failed requests
 */
export async function fetchJsonWithCorsHandling<T = any>(
  url: string,
  options?: RequestInit
): Promise<T | null> {
  const response = await fetchWithCorsHandling(url, options);
  if (!response || !response.ok) {
    return null;
  }
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

/**
 * Fetch text with CORS error handling
 * Returns null on CORS errors or failed requests
 */
export async function fetchTextWithCorsHandling(
  url: string,
  options?: RequestInit
): Promise<string | null> {
  const response = await fetchWithCorsHandling(url, options);
  if (!response || !response.ok) {
    return null;
  }
  try {
    return await response.text();
  } catch (error) {
    return null;
  }
}



