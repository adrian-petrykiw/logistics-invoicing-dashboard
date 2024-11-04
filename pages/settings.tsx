// pages/settings.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { FiPlus, FiUsers, FiEdit2, FiTrash2 } from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOrganization } from "@/features/auth/hooks/useOrganization";
import { useOrganizationMembers } from "@/features/auth/hooks/useOrganizationMembers";
import { OrganizationMember, Role } from "@/schemas/organizationSchemas";

interface EditMemberModalProps {
  member: OrganizationMember;
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
            <Input name="name" defaultValue={member.name} required />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={member.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Wallet Address</Label>
            <Input name="walletAddress" defaultValue={member.wallet_address} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select name="role" defaultValue={member.role}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
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
  const { connected } = useWallet();
  const { user, isAuthenticated } = useAuth();
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(
    null
  );

  const {
    organization,
    isLoading: orgLoading,
    createOrganization,
  } = useOrganization(user?.walletAddress || "");

  const {
    members,
    isLoading: membersLoading,
    addMember,
    updateMember,
    removeMember,
    canModifyMembers,
  } = useOrganizationMembers(organization?.id || null);

  // Protect route
  useEffect(() => {
    if (!connected || !isAuthenticated) {
      router.push("/");
    }
  }, [connected, isAuthenticated, router]);

  const handleCreateOrganization = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      await createOrganization.mutateAsync({
        name: formData.get("companyName") as string,
        multisig_wallet: formData.get("multisigWallet") as string,
        owner_name: formData.get("ownerName") as string,
        owner_email: user?.email || "",
        owner_wallet_address: user?.walletAddress || "",
        business_details: {
          companyName: formData.get("companyName") as string,
          companyAddress:
            (formData.get("companyAddress") as string) || undefined,
          companyPhone: (formData.get("companyPhone") as string) || undefined,
          companyEmail: (formData.get("companyEmail") as string) || undefined,
        },
      });

      setIsCreateOrgModalOpen(false);
      toast.success("Organization created successfully!");
    } catch (error) {
      toast.error("Failed to create organization");
      console.error("Create organization error:", error);
    }
  };

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

  const handleUpdateMember = async (updates: {
    role: Role;
    name?: string;
    wallet_address?: string;
  }) => {
    if (!editingMember) return;

    try {
      await updateMember.mutateAsync({
        userId: editingMember.user_id,
        updates,
      });
      toast.success("Member updated successfully!");
      setEditingMember(null);
    } catch (error) {
      toast.error("Failed to update member");
      console.error("Update member error:", error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!organization?.id) return;

    try {
      await removeMember.mutateAsync(userId);
      toast.success("Member removed successfully!");
    } catch (error) {
      toast.error("Failed to remove member");
      console.error("Remove member error:", error);
    }
  };

  if (!connected || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <Input value={user?.walletAddress || ""} disabled />
              </div>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Organization</CardTitle>
              {!organization && (
                <Dialog
                  open={isCreateOrgModalOpen}
                  onOpenChange={setIsCreateOrgModalOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <FiPlus className="mr-2" /> Create Organization
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Organization</DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={handleCreateOrganization}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label>Your Full Name</Label>
                        <Input name="ownerName" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Organization Name</Label>
                        <Input name="name" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Company Name</Label>
                        <Input name="companyName" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Company Address</Label>
                        <Input name="companyAddress" />
                      </div>
                      <div className="space-y-2">
                        <Label>Company Phone</Label>
                        <Input name="companyPhone" type="tel" />
                      </div>
                      <div className="space-y-2">
                        <Label>Company Email</Label>
                        <Input name="companyEmail" type="email" />
                      </div>
                      <div className="space-y-2">
                        <Label>Multisig Wallet Address</Label>
                        <Input name="multisigWallet" required />
                      </div>
                      <Button type="submit" className="w-full">
                        Create
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {organization ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Organization Name</Label>
                      <p className="mt-1">{organization.name}</p>
                    </div>
                    <div>
                      <Label>Multisig Wallet</Label>
                      <p className="mt-1 truncate">
                        {organization.multisig_wallet}
                      </p>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Team Members</h3>
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
                              <DialogTitle>Add Team Member</DialogTitle>
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
                              <div className="space-y-2">
                                <Label>Wallet Address</Label>
                                <Input name="walletAddress" required />
                              </div>
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select name="role" required>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button type="submit" className="w-full">
                                Add Member
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>

                    <div className="space-y-2">
                      {membersLoading ? (
                        <div>Loading members...</div>
                      ) : members?.length === 0 ? (
                        <div>No team members yet</div>
                      ) : (
                        members?.map((member) => (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {member.email}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {member.role.charAt(0).toUpperCase() +
                                  member.role.slice(1)}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {member.wallet_address}
                              </p>
                            </div>
                            {canModifyMembers && (
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
                                    handleRemoveMember(member.user_id)
                                  }
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
                <div>Loading organization...</div>
              ) : (
                <div className="text-center py-8">
                  <FiUsers className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">
                    No Organization Yet
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    Create an organization to start managing your team and
                    payments.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Member Modal */}
      {editingMember && (
        <EditMemberModal
          member={editingMember}
          isOpen={!!editingMember}
          onClose={() => setEditingMember(null)}
          onSubmit={handleUpdateMember}
        />
      )}
    </div>
  );
}
