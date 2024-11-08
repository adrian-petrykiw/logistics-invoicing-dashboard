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
import { PublicKey } from "@solana/web3.js";
import { getVaultPda } from "@sqds/multisig";
import Link from "next/link";

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

  const createMultisigMutation = useCreateMultisig();

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
                createMultisig={createMultisigMutation}
                createOrganization={createOrganization}
              />
            )}
          </CardHeader>
          <CardContent>
            {organization ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    {/* <Card className="bg-muted/50">
                      <CardHeader className="pb-0 mb-2">
                        <CardTitle className="text-sm">
                          {organization.business_details?.companyName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className=""></CardContent>
                    </Card> */}
                    <div className="p-4 border-gray-200 border-[1px] rounded-lg">
                      <h4 className="text-sm font-semibold">
                        {" "}
                        {organization.business_details?.companyName}
                      </h4>
                      <div className="p-0 m-0 space-y-2">
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <p className="text-xs text-muted-foreground">
                            {organization.business_details?.companyAddress}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Registration #:{" "}
                            {organization.business_details
                              ?.registrationNumber || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Tax ID:{" "}
                            {organization.business_details?.taxNumber || "N/A"}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <p className="text-xs text-muted-foreground">
                            Phone:{" "}
                            {organization.business_details?.companyPhone ||
                              "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Email: {organization.business_details?.companyEmail}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Link
                              href={
                                organization.business_details.companyWebsite
                                  ? `${organization.business_details.companyWebsite}`
                                  : ``
                              }
                            >
                              Website:{" "}
                              {organization.business_details.companyWebsite}
                            </Link>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium"> Multisig Account</p>
                    <Input
                      value={organization.multisig_wallet || ""}
                      disabled
                      type="text"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {" "}
                      Vault/Treasury Address
                    </p>
                    <Input
                      value={(() => {
                        const [vaultPda] = getVaultPda({
                          multisigPda: new PublicKey(
                            organization.multisig_wallet
                          ),
                          index: 0,
                        });
                        return vaultPda.toBase58();
                      })()}
                      disabled
                      type="text"
                    />
                  </div>
                </div>

                {/* Team Members */}
                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <h3 className="text-sm font-medium mb-[-8px]"> Members</h3>
                    {canModifyMembers && (
                      <Dialog
                        open={isAddMemberModalOpen}
                        onOpenChange={setIsAddMemberModalOpen}
                      >
                        <DialogTrigger asChild>
                          <Button>
                            <FiPlus className="mr-2" /> Add Member
                          </Button>

                          {/* <button
                            type="button"
                            // onClick={() => append({ number: "", amount: 0 })}
                            className="font-light text-center text-sm text-muted-foreground hover:text-black transition-colors flex items-center justify-end mr-2"
                          >
                            <FiPlus className="mr-[4px]" /> Add Member
                          </button> */}
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
                          className="flex items-center justify-between p-4 border border-gray-300 rounded-lg"
                        >
                          <div className="flex flex-row justify-between items-center w-full mr-4">
                            <div>
                              <p className="font-medium text-sm">
                                {member.name || "N/A"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {member.email || "N/A"}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">
                              {member.role.charAt(0).toUpperCase() +
                                member.role.slice(1)}
                            </p>
                            {/* <p className="text-sm text-muted-foreground truncate">
                              {member.wallet_address || "N/A"}
                            </p> */}
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
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <Card className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-sm">
                          Business Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-4 w-[150px]" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        Multisig Account
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <Skeleton className="h-9 w-full" />
                        <Skeleton className="h-9 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Vault Address</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <Skeleton className="h-9 w-full" />
                    </CardContent>
                  </Card>
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
