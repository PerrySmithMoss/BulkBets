import { API_ROUTES } from "../api/constants";

export const refreshClientTokens = async (): Promise<boolean> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/${API_ROUTES.AUTH.REFRESH_TOKENS}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    if (response.ok) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error refreshing token: ", error);
    return false;
  }
};
