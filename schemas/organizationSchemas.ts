// types/orgSchemas.ts
import { z } from "zod";

export const WalletAddressSchema = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid wallet address");

export const EmailSchema = z.string().email("Invalid email address");

export const RoleSchema = z.enum(["owner", "admin", "user"]);

// Updated Business details schema
export const BusinessDetailsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: EmailSchema.optional(),
  registrationNumber: z.string().optional(),
  website: z.string().url().optional(),
});

// Organization schema
export const OrganizationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Organization name is required"),
  multisig_wallet: WalletAddressSchema,
  business_details: BusinessDetailsSchema,
  created_at: z.string().datetime().optional(),
});

// Organization member schema with email
export const OrganizationMemberSchema = z.object({
  user_id: z.string(),
  organization_id: z.string().uuid(),
  role: RoleSchema,
  wallet_address: WalletAddressSchema,
  name: z.string().min(1, "Name is required"),
  email: EmailSchema,
  created_at: z.string().datetime().optional(),
});

// Form input schemas
export const CreateOrganizationInputSchema = OrganizationSchema.omit({
  id: true,
  created_at: true,
}).extend({
  owner_name: z.string().min(1, "Owner name is required"),
  owner_email: EmailSchema,
  owner_wallet_address: WalletAddressSchema,
});

export const AddMemberInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: EmailSchema,
  role: RoleSchema,
  wallet_address: WalletAddressSchema,
});

export const UpdateMemberInputSchema = z.object({
  role: RoleSchema,
  name: z.string().min(1, "Name is required").optional(),
  wallet_address: WalletAddressSchema.optional(),
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
export type UpdateMemberInput = z.infer<typeof UpdateMemberInputSchema>;
