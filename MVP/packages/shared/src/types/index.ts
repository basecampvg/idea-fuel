// Shared TypeScript types
export interface User {
  id: string;
  name: string;
  email: string;
}

export type ApiResponse<T> = {
  data: T;
  error?: string;
  success: boolean;
};
