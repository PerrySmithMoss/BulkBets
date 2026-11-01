import { tryFetcher } from "@/lib/utils/tryFetcher";

export const logoutUser = async (
  userId: string | undefined
): Promise<true | false> => {
  try {
    if (!userId) {
      console.error("[logoutUser] - No userId passed");
      return true;
    }

    const { error: fetchError } = await tryFetcher(
      fetch(`/api/v1/auth/logout`, {
        method: "DELETE",
        cache: "no-store",
        credentials: "include",
      })
    );

    if (fetchError) {
      console.error(`Error logging out user ${userId}: `, fetchError);
      return false;
    }

    return true;
  } catch (error) {
    const errorMessage = `Unexpected error during logout: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(errorMessage);
    return false;
  }
};
