export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          multisig_wallet: string;
          business_details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          multisig_wallet: string;
          business_details: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          multisig_wallet?: string;
          business_details?: Json;
          created_at?: string;
        };
      };
      organization_members: {
        Row: {
          user_id: string;
          organization_id: string;
          role: "owner" | "admin" | "user";
          personal_wallet: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          organization_id: string;
          role: "owner" | "admin" | "user";
          personal_wallet: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          organization_id?: string;
          role?: "owner" | "admin" | "user";
          personal_wallet?: string;
          created_at?: string;
        };
      };
    };
  };
}
