import { z } from "zod";

export const WalletAddressSchema = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid wallet address");

export const EmailSchema = z.string().email("Invalid email address");

// Role schema
export const RoleSchema = z.enum(["owner", "admin", "user"]);

// Business details schema
export const BusinessDetailsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  registrationNumber: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional(),
  phoneNumber: z.string().optional(),
});

// Organization schema
export const OrganizationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Organization name is required"),
  multisig_wallet: WalletAddressSchema,
  business_details: BusinessDetailsSchema,
  created_at: z.string().datetime().optional(),
});

// Organization member schema
export const OrganizationMemberSchema = z.object({
  user_id: z.string(),
  organization_id: z.string().uuid(),
  role: RoleSchema,
  personal_wallet: WalletAddressSchema,
  created_at: z.string().datetime().optional(),
});

// Form input schemas
export const CreateOrganizationInputSchema = OrganizationSchema.omit({
  id: true,
  created_at: true,
});

export const AddMemberInputSchema = OrganizationMemberSchema.omit({
  created_at: true,
}).extend({
  email: EmailSchema,
});

// Export types
export type Role = z.infer<typeof RoleSchema>;
export type BusinessDetails = z.infer<typeof BusinessDetailsSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;
export type CreateOrganizationInput = z.infer<
  typeof CreateOrganizationInputSchema
>;
export type AddMemberInput = z.infer<typeof AddMemberInputSchema>;
