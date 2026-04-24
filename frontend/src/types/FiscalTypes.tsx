export interface UserProfile {
  username: string;
  password: string;
  regime: "forfettario" | "semplificato";
  cassa: "INARCASSA" | "ENPAP" | "ENPAPI" | "GS INPS";
  commercialista_export_key: string;
  vat_opening_date: string;
}

export interface UserRevenue {
  username: string;
  year: number;
  revenue: number;
}

export interface UserApiResponse {
  ok?: boolean;
  error?: string;
  key?: string;
  name?: string;
  surname?: string;
}

export interface Commercialista {
  key: string;
  name: string;
  surname: string;
}

export interface CommercialistaCreateInput {
  name: string;
  surname: string;
  key?: string;
}

// Backward-compatible aliases for existing imports.
export type FiscalUser = UserProfile;
export type FiscalRevenue = UserRevenue;
export type FiscalApiResponse = UserApiResponse;
