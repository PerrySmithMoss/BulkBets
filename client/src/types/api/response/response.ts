export type ApiResponse<T> = {
  data: T | null;
  error: {
    message: string;
    code: string;
    status: number;
  } | null;
};
