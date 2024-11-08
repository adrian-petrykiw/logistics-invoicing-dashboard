import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { FiPlus, FiUsers, FiEdit2, FiTrash2 } from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { useOrganization } from "@/features/auth/hooks/useOrganization";
import { useOrganizationMembers } from "@/features/auth/hooks/useOrganizationMembers";
import {
  OrganizationMember,
  OrganizationMemberResponse,
  Role,
  UpdateMemberInput,
} from "@/schemas/organization";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorRegistrationModal } from "@/features/settings/components/RegistrationModal";
import { useCreateMultisig } from "@/hooks/squads";

interface EditMemberModalProps {
  member: OrganizationMemberResponse;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updates: {
    name?: string;
    role: Role;
    wallet_address?: string;
  }) => Promise<void>;
}

const EditMemberModal = ({
  member,
  isOpen,
  onClose,
  onSubmit,
}: EditMemberModalProps) => {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      await onSubmit({
        name: formData.get("name") as string,
        role: formData.get("role") as Role,
        wallet_address: formData.get("walletAddress") as string,
      });
      onClose();
    } catch (error) {
      toast.error("Failed to update member");
      console.error("Update member error:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input name="name" defaultValue={member.name || ""} required />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={member.email || ""} disabled />
          </div>
          {/* <div className="space-y-2">
            <Label>Wallet Address</Label>
            <Input
              name="walletAddress"
              defaultValue={member.wallet_address || ""}
            />
          </div> */}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select name="role" defaultValue={member.role}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full">
            Update Member
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function SettingsPage() {
  const router = useRouter();
  const { connected, wallet, publicKey } = useWallet();
  const [userInfo, setUserInfo] = useState<{ email: string } | null>(null);
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] =
    useState<OrganizationMemberResponse | null>(null);

  const { mutate: createMultisig, isPending } = useCreateMultisig();

  const {
    organization,
    isLoading: orgLoading,
    createOrganization,
  } = useOrganization(publicKey?.toBase58() || "");

  const {
    members,
    isLoading: membersLoading,
    addMember,
    updateMember,
    removeMember,
    canModifyMembers,
  } = useOrganizationMembers(organization?.id || null);

  useEffect(() => {
    if (connected && wallet?.adapter.name === "Particle") {
      const info = window.particle?.auth.getUserInfo();
      setUserInfo({
        email: info?.email || info?.google_email || "",
      });
    }
  }, [connected, wallet?.adapter.name]);

  // Handle Coinbase payment status
  // useEffect(() => {
  //   const checkPaymentStatus = async () => {
  //     const storedData = localStorage.getItem("vendorRegistrationData");

  //     if (storedData && router.query.payment === "complete") {
  //       try {
  //         setPaymentStatus("processing");
  //         const formData = JSON.parse(storedData);

  //         // Implement webhook check here
  //         // const paymentConfirmed = await checkPaymentWebhook(formData.partnerUserId);

  //         // For now, proceed with organization creation
  //         if (!publicKey) return;

  //         // Create multisig wallet
  //         const { multisigPda } = await createMultisig.mutateAsync({
  //           creator: publicKey,
  //           email: userInfo?.email || "",
  //           configAuthority: publicKey,
  //         });

  //         // Create organization
  //         await createOrganization.mutateAsync({
  //           name: formData.companyName,
  //           multisig_wallet: multisigPda.toBase58(),
  //           owner_name: formData.ownerName,
  //           owner_email: userInfo?.email || "",
  //           owner_wallet_address: publicKey.toBase58(),
  //           business_details: {
  //             companyName: formData.companyName,
  //             companyAddress: formData.companyAddress,
  //             companyPhone: formData.companyPhone,
  //             companyEmail: formData.companyEmail,
  //           },
  //         });

  //         localStorage.removeItem("vendorRegistrationData");
  //         router.replace("/settings", undefined, { shallow: true });
  //         setPaymentStatus("none");
  //         toast.success("Organization registered successfully!");
  //       } catch (error) {
  //         console.error("Payment/Registration failed:", error);
  //         setPaymentStatus("failed");
  //         localStorage.removeItem("vendorRegistrationData");
  //         toast.error("Failed to complete registration");
  //       }
  //     }
  //   };

  //   checkPaymentStatus();
  // }, [
  //   router.query.payment,
  //   publicKey,
  //   createMultisig,
  //   createOrganization,
  //   userInfo,
  // ]);

  // Check for pending registration on mount
  // useEffect(() => {
  //   const storedData = localStorage.getItem("vendorRegistrationData");
  //   if (storedData) {
  //     setPaymentStatus("pending");
  //   }
  // }, []);

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      await addMember.mutateAsync({
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        role: formData.get("role") as Role,
        wallet_address: formData.get("walletAddress") as string,
      });

      setIsAddMemberModalOpen(false);
      toast.success("Member added successfully!");
    } catch (error) {
      toast.error("Failed to add member");
      console.error("Add member error:", error);
    }
  };

  const handleUpdateMember = async (updates: UpdateMemberInput) => {
    if (!editingMember) return;

    try {
      if (editingMember.user_id) {
        await updateMember.mutateAsync({
          userId: editingMember.user_id,
          updates,
        });
        toast.success("Member updated successfully!");
      } else {
        toast.error("Cannot update member without user ID");
      }
      setEditingMember(null);
    } catch (error) {
      toast.error("Failed to update member");
      console.error("Update member error:", error);
    }
  };

  const handleRemoveMember = async (userId: string | undefined) => {
    if (!organization?.id || !userId) return;

    try {
      await removeMember.mutateAsync(userId);
      toast.success("Member removed successfully!");
    } catch (error) {
      toast.error("Failed to remove member");
      console.error("Remove member error:", error);
    }
  };

  // Loading states
  if (!connected) {
    return null;
  }

  if (!userInfo) {
    return <div>Loading user data...</div>;
  }

  return (
    <main className="container mx-auto py-8 ">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-tertiary">Settings</h1>
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={userInfo.email} disabled type="email" />
              </div>
              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <Input
                  value={publicKey?.toBase58() || ""}
                  disabled
                  type="text"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organization */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Organization</CardTitle>
            {!organization && (
              <VendorRegistrationModal
                isOpen={isCreateOrgModalOpen}
                onOpenChange={setIsCreateOrgModalOpen}
                userInfo={userInfo}
                onSubmitSuccess={() => {}}
                createMultisig={useCreateMultisig()}
                createOrganization={createOrganization}
              />
            )}
          </CardHeader>
          <CardContent>
            {/* {renderPaymentStatus()} */}

            {organization ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <p className="mt-1 text-xs">{organization.name}</p>
                  </div>
                  <div>
                    <Label>Multisig Wallet</Label>
                    <p className="mt-1 truncate text-xs">
                      {organization.multisig_wallet}
                    </p>
                  </div>
                </div>

                {/* Team Members */}
                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <h3 className="text-sm font-medium"> Members</h3>
                    {canModifyMembers && (
                      <Dialog
                        open={isAddMemberModalOpen}
                        onOpenChange={setIsAddMemberModalOpen}
                      >
                        <DialogTrigger asChild>
                          <Button>
                            <FiPlus className="mr-2" /> Add Member
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Member</DialogTitle>
                          </DialogHeader>
                          <form
                            onSubmit={handleAddMember}
                            className="space-y-4"
                          >
                            <div className="space-y-2">
                              <Label>Full Name</Label>
                              <Input name="name" required />
                            </div>
                            <div className="space-y-2">
                              <Label>Email</Label>
                              <Input name="email" type="email" required />
                            </div>
                            {/* <div className="space-y-2">
                              <Label>Wallet Address</Label>
                              <Input name="walletAddress" required />
                            </div> */}
                            <div className="space-y-2">
                              <Label>Role</Label>
                              <Select name="role" required>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="user">Member</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {/* <Button type="submit" className="w-full">
                              Add Member 
                            </Button> */}

                            <Button type="submit" className="w-full" disabled>
                              COMING SOON
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  <div className="space-y-2">
                    {membersLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton
                            key={i}
                            className="h-24 w-full rounded-lg"
                          />
                        ))}
                      </div>
                    ) : members?.length === 0 ? (
                      <div>No team members yet</div>
                    ) : (
                      members?.map((member: OrganizationMemberResponse) => (
                        <div
                          key={member.user_id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              {member.name || "N/A"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.email || "N/A"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.role.charAt(0).toUpperCase() +
                                member.role.slice(1)}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {member.wallet_address || "N/A"}
                            </p>
                          </div>
                          {canModifyMembers && member.role !== "owner" && (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingMember(member)}
                              >
                                <FiEdit2 />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() =>
                                  member.user_id
                                    ? handleRemoveMember(member.user_id)
                                    : undefined
                                }
                                disabled={!member.user_id}
                              >
                                <FiTrash2 />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : orgLoading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Organization</Label>
                    <Skeleton className="h-6 w-[200px] mt-1" />
                  </div>
                  <div>
                    <Label>Multisig Wallet</Label>
                    <Skeleton className="h-6 w-[300px] mt-1" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Members</h3>
                  </div>
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-24 w-full rounded-lg" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FiUsers className="mx-auto h-8 w-8 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">
                  No Business Registered
                </h3>
                <p className="mt-2 text-muted-foreground text-sm">
                  Create an organization to start managing your team and making
                  payments.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Edit Member Modal */}
      {editingMember && (
        <EditMemberModal
          member={editingMember}
          isOpen={!!editingMember}
          onClose={() => setEditingMember(null)}
          onSubmit={handleUpdateMember}
        />
      )}
    </main>
  );
}
