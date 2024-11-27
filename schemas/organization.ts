import { z } from "zod";

export const WalletAddressSchema = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid wallet address");

export const EmailSchema = z.string().email("Invalid email address");

export const RoleSchema = z.enum(["owner", "admin", "user"]);

export const StatusSchema = z.enum(["invited", "active", "suspended"]);

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: ApiErrorSchema.optional(),
});

const CustomFieldSchema = z.object({
  name: z.string(),
  required: z.boolean().default(false),
  type: z.enum(["text", "number"]),
  key: z.string(),
});
export const BusinessDetailsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email().optional(),
  companyWebsite: z.string().url().optional(),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  ownerName: z.string().min(1, "Owner name is required"),
  ownerEmail: z.string().email("Invalid owner email"),
  ownerWalletAddress: WalletAddressSchema,
  customFields: z.array(CustomFieldSchema).optional(),
});

export const TimestampSchema = z.string().refine(
  (date) => {
    try {
      const d = new Date(date);
      return !isNaN(d.getTime());
    } catch {
      return false;
    }
  },
  {
    message: "Invalid date format",
  }
);

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Organization name is required"),
  multisig_wallet: WalletAddressSchema,
  business_details: BusinessDetailsSchema,
  created_at: TimestampSchema,
  created_by: z.string().uuid(),
});

export const OrganizationResponseSchema = OrganizationSchema;

export const OrganizationWithMemberSchema = OrganizationSchema.extend({
  organization_members: z.array(
    z.object({
      role: RoleSchema,
    })
  ),
});

export const OrganizationMemberSchema = z.object({
  user_id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  email: EmailSchema,
  role: RoleSchema,
  status: StatusSchema,
  wallet_address: WalletAddressSchema.optional(),
  created_at: TimestampSchema.optional(),
  invited_by: z.string().uuid().optional(),
  invited_at: TimestampSchema.nullable(),
});

export const OrganizationMemberResponseSchema = z.object({
  user_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string().nullable(),
  email: EmailSchema.nullable(),
  role: RoleSchema,
  status: StatusSchema.default("active"),
  wallet_address: WalletAddressSchema.nullable(),
  created_at: TimestampSchema,
  invited_by: z.string().uuid().nullable(),
  invited_at: TimestampSchema.nullable(),
  user: z
    .object({
      id: z.string().uuid(),
      email: EmailSchema,
      name: z.string().nullable(),
      wallet_address: WalletAddressSchema,
    })
    .nullable(),
  inviter: z
    .object({
      id: z.string().uuid(),
      email: EmailSchema,
      name: z.string().nullable(),
    })
    .nullable(),
});

export const CreateOrganizationInputSchema = OrganizationSchema.omit({
  id: true,
  created_at: true,
  created_by: true,
});

export const AddMemberInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: EmailSchema,
  role: RoleSchema,
  wallet_address: WalletAddressSchema.optional(),
});

export const UpdateMemberInputSchema = z.object({
  role: RoleSchema,
  name: z.string().min(1, "Name is required").optional(),
  wallet_address: WalletAddressSchema.optional(),
});

export const UserDataSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  wallet_address: z.string(),
});

export const MemberDataSchema = z.object({
  user_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  role: z.enum(["owner", "admin", "user"]),
  status: z.enum(["invited", "active", "suspended"]),
  email: z.string().nullable(),
  name: z.string().nullable(),
  wallet_address: z.string().nullable(),
  created_at: z.string(),
  invited_by: z.string().uuid().nullable(),
  invited_at: z.string().nullable(),
  user: UserDataSchema.nullable(),
  inviter: UserDataSchema.omit({ wallet_address: true }).nullable(),
});

// Type exports
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: ApiError;
};
export type Role = z.infer<typeof RoleSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type BusinessDetails = z.infer<typeof BusinessDetailsSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type OrganizationResponse = z.infer<typeof OrganizationResponseSchema>;
export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;
export type OrganizationWithMember = z.infer<
  typeof OrganizationWithMemberSchema
>;
export type OrganizationMemberResponse = z.infer<
  typeof OrganizationMemberResponseSchema
>;
export type CreateOrganizationInput = z.infer<
  typeof CreateOrganizationInputSchema
>;
export type AddMemberInput = z.infer<typeof AddMemberInputSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberInputSchema>;
export type UserData = z.infer<typeof UserDataSchema>;
export type MemberData = z.infer<typeof MemberDataSchema>;

// Utility type for pagination and filtering
export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export interface UpdateMemberParams {
  userId: string | undefined;
  updates: UpdateMemberInput;
}
