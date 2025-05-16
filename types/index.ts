export interface AuthCredentials {
  fullName: string;
  email: string;
  password: string;
}

export interface Categories {
  id: number;
  name: string;
  description: string | null;
}
