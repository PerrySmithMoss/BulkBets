import { refreshClientTokens } from "./tokens";

type FetcherResult<T> = {
  data: T | null;
  error: string | null;
};

// Wrapper function for tryFetcher that handles 401 errors and refreshes the token
// withCatch
export const tryFetcher = async <T>(
  promise: Promise<Response>
): Promise<FetcherResult<T>> => {
  try {
    const response = await promise;

    if (response.status === 401) {
      console.log("Unauthorized error (401), attempting to refresh token...");

      const tokenRefreshed = await refreshClientTokens();

      if (tokenRefreshed) {
        const retryData = await promise;
        const retryJson: T = await retryData.json();
        return { data: retryJson, error: null };
      } else {
        return { data: null, error: "Token refresh failed" };
      }
    }

    if (!response.ok) {
      console.error("Request failed with status: ", response.status);
      return { data: null, error: `HTTP error: ${response.statusText}` };
    }

    const json: T = await response.json();
    return { data: json, error: null };
  } catch (error) {
    console.error("Error while fetching data: ", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
