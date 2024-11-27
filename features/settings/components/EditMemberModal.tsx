import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrganizationMemberResponse, Role } from "@/schemas/organization";
import { toast } from "react-hot-toast";

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

export const EditMemberModal = ({
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
      <DialogContent
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
        }}
      >
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
