export interface AuthCredentials {
  fullName: string;
  email: string;
  password: string;
}

//index.ts

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

// For form values (excludes id, makes description non-null)
export type CategoryFormValues = {
  name: string;
  description: string;
};
