export interface AuthCredentials {
  fullName: string;
  email: string;
  password: string;
}

export interface Categories {
  id: string;
  name: string;
  description: string | null;
}
