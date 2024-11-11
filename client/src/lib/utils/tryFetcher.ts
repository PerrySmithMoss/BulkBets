type FetcherResult<T> = {
  data: T | null;
  error: unknown;
};

export const tryFetcher = async <T>(
  promise: Promise<T>
): Promise<FetcherResult<T>> => {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
