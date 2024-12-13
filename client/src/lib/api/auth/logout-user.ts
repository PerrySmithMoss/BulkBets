import { tryFetcher } from "@/lib/utils/tryFetcher";

export const logoutUser = async (
  userId: string | undefined
): Promise<true | false> => {
  try {
    if (!userId) {
      console.error("[logoutUser] - No userId passed");
      return true;
    }

    const { data: response, error: fetchError } = await tryFetcher(
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/auth/logout`, {
        method: "DELETE",
        cache: "no-store",
        credentials: "include",
      })
    );

    if (fetchError) {
      console.error(`Error logging out user ${userId}: `, fetchError);
      return false;
    }

    if (!response) {
      console.error(
        `No response received while attempting to logout user ${userId}`
      );
      return false;
    }

    return true;
  } catch (error) {
    // Catch any unexpected errors
    const errorMessage = `Unexpected error during logout: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(errorMessage);
    return false;
  }
};
