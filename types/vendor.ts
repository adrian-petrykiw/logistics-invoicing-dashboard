export interface CustomField {
  name: string;
  required: boolean;
  type: "text" | "number";
  key: string;
}

export interface BusinessDetails {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite?: string;
  registrationNumber?: string;
  taxNumber?: string;
  ownerName: string;
  ownerEmail: string;
  ownerWalletAddress: string;
  customFields?: CustomField[];
}

export interface Organization {
  id: string;
  business_details: BusinessDetails;
  created_by: string;
}

export interface VendorListItem {
  id: string;
  name: string;
}

export interface VendorDetails {
  id: string;
  business_details: BusinessDetails;
}

export interface VendorInfo {
  name: string;
  multisigAddress: string;
  vaultAddress: string;
  ownerAddress: string;
}

export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: {
        error: string;
        code: string;
        details?: any;
      };
      data?: never;
    };
