import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  CalendarIcon,
  CaretSortIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentMethod } from "@/types/transaction";
import { USDC_MINT } from "@/utils/constants";
import { useOrganization } from "@/features/auth/hooks/useOrganization";
import {
  useVendorSelection,
  useAvailableVendors,
} from "@/hooks/useVendorSelection";
import { getVaultPda } from "@sqds/multisig";
import { PublicKey } from "@solana/web3.js";
import { InvoiceFileUpload } from "@/components/InvoiceFileUpload";
import { useFileUpload } from "@/hooks/useFileUpload";
import toast from "react-hot-toast";
import { Textarea } from "@/components/ui/textarea";
import { useVendorInfo } from "@/hooks/useVendorInfo";

interface CreatePaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  userWalletAddress: string;
  userEmail: string;
}

interface FormValues {
  vendor: string;
  recipient: {
    name: string;
    email: string;
  };
  invoices: Array<{
    number: string;
    amount: number;
    files?: File[];
  }>;
  due_date: Date;
  restricted_payment_methods: PaymentMethod[];
  notes: string;
  [key: string]: any;
}

export function CreatePaymentLinkModal({
  isOpen,
  onClose,
  userWalletAddress,
  userEmail,
}: CreatePaymentLinkModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [isNewVendor, setIsNewVendor] = useState(false);
  const queryClient = useQueryClient();
  const { data: availableVendors = [], isLoading: vendorsLoading } =
    useAvailableVendors();
  const { data: vendorDetails, isLoading: vendorDetailsLoading } =
    useVendorSelection(selectedVendor);
  const { organization } = useOrganization(userWalletAddress);
  const { uploadFiles } = useFileUpload(organization?.id || "");
  const { data: vendorInfo } = useVendorInfo(selectedVendor);
  const { user } = useAuth();

  const filteredVendors = [
    { id: "new", name: "+ SEND TO A NEW VENDOR", email: "" },
    ...availableVendors.filter((vendor) =>
      vendor.name.toLowerCase().includes(query.toLowerCase())
    ),
  ];

  const isFormValid = () => {
    const values = form.getValues();

    // Check if vendor is selected
    if (!values.vendor) return false;

    // Check if at least one invoice is valid
    const hasValidInvoice = values.invoices.some(
      (invoice) => invoice.number.trim() !== "" && invoice.amount > 0
    );
    if (!hasValidInvoice) return false;

    // If it's a new vendor, check recipient details
    if (isNewVendor) {
      if (!values.recipient.name.trim() || !values.recipient.email.trim()) {
        return false;
      }
    }

    // Check required custom fields for existing vendors
    if (!isNewVendor && vendorDetails?.business_details.customFields) {
      const requiredFields = vendorDetails.business_details.customFields.filter(
        (field) => field.required
      );

      const hasAllRequiredFields = requiredFields.every(
        (field) =>
          values[field.key] && values[field.key].toString().trim() !== ""
      );

      if (!hasAllRequiredFields) return false;
    }

    return true;
  };

  const form = useForm<FormValues>({
    defaultValues: {
      vendor: "",
      recipient: {
        name: "",
        email: "",
      },
      invoices: [{ number: "", amount: 0, files: [] }],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      restricted_payment_methods: [],
      notes: "",
      ...(vendorDetails?.business_details.customFields?.reduce(
        (acc, field) => ({
          ...acc,
          [field.key]: "",
        }),
        {}
      ) || {}),
    },
    mode: "onChange", // Enable real-time validation
  });

  const totalAmount = form
    .watch("invoices")
    .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

  // Add reset function
  const resetFormState = () => {
    form.reset({
      vendor: "",
      recipient: {
        name: "",
        email: "",
      },
      invoices: [{ number: "", amount: 0, files: [] }],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      restricted_payment_methods: [],
      notes: "",
    });
    setSelectedVendor(null);
    setIsNewVendor(false);
    setQuery("");
    setOpen(false);
  };

  // Updated dialog close handler
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetFormState();
      onClose();
    }
  };

  const handleVendorSelection = (vendorId: string) => {
    if (vendorId === "new") {
      setIsNewVendor(true);
      form.setValue("recipient.name", "");
      form.setValue("recipient.email", "");
    } else {
      setIsNewVendor(false);
      const vendor = availableVendors.find((v) => v.id === vendorId);
      if (vendorDetails) {
        form.setValue(
          "recipient.name",
          vendorDetails.business_details.companyName
        );
        form.setValue(
          "recipient.email",
          vendorDetails.business_details.companyEmail
        );
      }
    }
    form.setValue("vendor", vendorId);
    setSelectedVendor(vendorId);
    setOpen(false);
    setQuery("");
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      if (!organization) {
        throw new Error("No organization found for user");
      }
      if (!user) {
        throw new Error("User must be authenticated");
      }

      let vaultAddress: string;
      try {
        const multisigPda = new PublicKey(organization.multisig_wallet);
        const [vaultPda] = getVaultPda({
          multisigPda,
          index: 0,
        });
        vaultAddress = vaultPda.toBase58();
      } catch (error) {
        console.error("Failed to calculate vault address:", error);
        throw new Error("Invalid multisig or vault configuration");
      }

      const paymentRequestData = {
        creator_email: organization.business_details.companyEmail,
        organization:
          selectedVendor === "new"
            ? {
                name: data.recipient.name,
                email: data.recipient.email,
              }
            : {
                id: selectedVendor,
              },
        token_mint: USDC_MINT,
        amount: data.invoices.reduce((sum, inv) => sum + inv.amount, 0),
        sender: {
          wallet_address: userWalletAddress,
          multisig_address: organization.multisig_wallet,
          vault_address: vaultAddress,
        },
        recipient: vendorInfo
          ? {
              multisig_address: vendorInfo.multisigAddress,
              vault_address: vendorInfo.vaultAddress,
            }
          : undefined,
        invoices: data.invoices.map(({ files, ...invoice }) => invoice),
        due_date: data.due_date.toISOString(),
        restricted_payment_methods: data.restricted_payment_methods,
        notes: data.notes,
      };

      const response = await fetch("/api/payment-requests/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user.email,
          "x-wallet-address": user.walletAddress,
          "x-user-info": JSON.stringify(user.userInfo),
        },
        body: JSON.stringify(paymentRequestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create payment request");
      }

      const { id: transactionId } = await response.json();

      await Promise.all(
        data.invoices.map(async (invoice) => {
          if (invoice.files?.length) {
            const uploadedFiles = await uploadFiles(
              invoice.files,
              transactionId,
              invoice.number
            );

            await fetch(`/api/transactions/${transactionId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "x-user-email": user.email,
                "x-wallet-address": user.walletAddress,
                "x-user-info": JSON.stringify(user.userInfo),
              },
              body: JSON.stringify({
                invoices: data.invoices.map((inv) =>
                  inv.number === invoice.number
                    ? { ...inv, files: uploadedFiles.map((f) => f.url) }
                    : inv
                ),
              }),
            });
          }
        })
      );

      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Payment request sent!");
      resetFormState(); // Reset form state on successful submission
      onClose();
    } catch (error) {
      console.error("Failed to create payment request:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create payment request"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent
        className="w-full max-w-[90%] h-[90vh] p-0 overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
        }}
      >
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Create Payment Request
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            <Form {...form}>
              <form
                id="payment-request-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6 pb-24"
              >
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="vendor"
                    rules={{
                      required: "Please select a vendor",
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor/Biller</FormLabel>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={`w-full justify-between ${
                                  !field.value && "text-muted-foreground"
                                }`}
                              >
                                {field.value === "new"
                                  ? "+ SEND TO A NEW VENDOR"
                                  : field.value
                                  ? availableVendors.find(
                                      (vendor) => vendor.id === field.value
                                    )?.name
                                  : "Select vendor"}
                                <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search vendors..."
                                className="h-9"
                                value={query}
                                onValueChange={setQuery}
                              />
                              <CommandList>
                                <CommandEmpty>No vendors found.</CommandEmpty>
                                <CommandGroup>
                                  {vendorsLoading ? (
                                    <div className="p-4">
                                      <Skeleton className="h-5 w-full" />
                                    </div>
                                  ) : (
                                    filteredVendors.map((vendor) => (
                                      <CommandItem
                                        key={vendor.id}
                                        value={vendor.id}
                                        onSelect={() =>
                                          handleVendorSelection(vendor.id)
                                        }
                                      >
                                        {vendor.name}
                                        <CheckIcon
                                          className={`ml-auto h-4 w-4 ${
                                            vendor.id === field.value
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                      </CommandItem>
                                    ))
                                  )}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedVendor && (
                    <>
                      {/* Vendor Details Card */}
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          {isNewVendor ? (
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="recipient.name"
                                rules={{
                                  required: "Vendor name is required",
                                }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        placeholder="Enter vendor name"
                                        {...field}
                                        onChange={(e) => {
                                          field.onChange(e);
                                          form.trigger();
                                        }}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="recipient.email"
                                rules={{
                                  required: "Vendor email is required",
                                  pattern: {
                                    value:
                                      /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: "Invalid email address",
                                  },
                                }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="email"
                                        placeholder="Enter vendor email"
                                        {...field}
                                        onChange={(e) => {
                                          field.onChange(e);
                                          form.trigger();
                                        }}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ) : vendorDetailsLoading ? (
                            <div className="space-y-1 p-0 m-0">
                              <Skeleton className="h-[14px] w-[250px]" />
                              <Skeleton className="h-[12px] w-[200px]" />
                              <Skeleton className="h-[12px] w-[150px]" />
                            </div>
                          ) : vendorDetails ? (
                            <div className="p-0 m-0">
                              <h4 className="font-semibold text-sm">
                                {vendorDetails.business_details.companyName}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {vendorDetails.business_details.companyAddress}
                              </p>
                              <div className="flex w-full">
                                <p className="text-xs text-muted-foreground">
                                  {vendorDetails.business_details.companyPhone}
                                </p>
                                <p className="text-xs text-muted-foreground ml-4">
                                  {vendorDetails.business_details.companyEmail}
                                </p>
                              </div>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>

                      {/* Invoice Section */}
                      <div className="space-y-4">
                        <div className="flex gap-6">
                          <div className="w-[40%]">
                            <FormLabel>Invoice</FormLabel>
                          </div>
                          <div className="w-[30%]">
                            <FormLabel className="text-sm text-muted-foreground">
                              Amount (USDC)
                            </FormLabel>
                          </div>
                          <div className="w-[30%]" />
                        </div>

                        {form.watch("invoices").map((_, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex gap-6 w-full items-start">
                              <FormField
                                control={form.control}
                                name={`invoices.${index}.number`}
                                rules={{
                                  required: "Invoice number is required",
                                }}
                                render={({ field }) => (
                                  <FormItem className="w-[40%]">
                                    <FormControl>
                                      <Input
                                        placeholder="Enter invoice #"
                                        {...field}
                                        onChange={(e) => {
                                          field.onChange(e);
                                          form.trigger();
                                        }}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`invoices.${index}.amount`}
                                rules={{
                                  required: "Amount is required",
                                  min: {
                                    value: 0.01,
                                    message: "Amount must be greater than 0",
                                  },
                                }}
                                render={({ field }) => (
                                  <FormItem className="w-[30%]">
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder="0.00"
                                        {...field}
                                        onChange={(e) => {
                                          field.onChange(
                                            parseFloat(e.target.value)
                                          );
                                          form.trigger();
                                        }}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="w-[30%] flex items-center gap-4">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => {
                                    const invoices = form.getValues("invoices");
                                    form.setValue(
                                      "invoices",
                                      invoices.filter((_, i) => i !== index)
                                    );
                                    form.trigger();
                                  }}
                                  className="flex-shrink-0 hover:opacity-70 transition-opacity"
                                >
                                  <TrashIcon
                                    className={`h-5 w-5 ${
                                      index === 0
                                        ? "text-gray-300"
                                        : "text-black"
                                    }`}
                                  />
                                </button>
                                <FormField
                                  control={form.control}
                                  name={`invoices.${index}.files`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <InvoiceFileUpload
                                        files={field.value || []}
                                        onFilesChange={(files) =>
                                          form.setValue(
                                            `invoices.${index}.files`,
                                            files
                                          )
                                        }
                                        disabled={isSubmitting}
                                        index={index}
                                      />
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            const invoices = form.getValues("invoices");
                            form.setValue("invoices", [
                              ...invoices,
                              { number: "", amount: 0, files: [] },
                            ]);
                          }}
                          className="w-full text-center pt-2 text-sm text-muted-foreground hover:text-black transition-colors flex items-center justify-center gap-2"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Add Another Invoice
                        </button>
                      </div>

                      {/* Custom Fields */}
                      {vendorDetails && !isNewVendor && (
                        <>
                          {vendorDetails.business_details.customFields?.map(
                            (field) => (
                              <FormField
                                key={field.key}
                                control={form.control}
                                name={field.key}
                                rules={{
                                  required: field.required
                                    ? `${field.name} is required`
                                    : false,
                                }}
                                render={({ field: formField }) => (
                                  <FormItem>
                                    <FormLabel>{field.name}</FormLabel>
                                    <FormControl>
                                      <Input
                                        type={
                                          field.type === "number"
                                            ? "number"
                                            : "text"
                                        }
                                        placeholder={`Enter ${field.name.toLowerCase()}`}
                                        required={field.required}
                                        {...formField}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )
                          )}
                        </>
                      )}

                      {/* Notes Field */}
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter additional notes"
                                className="min-h-[60px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Due Date and Total Amount */}
                      <div className="flex gap-6">
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name="due_date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Due Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value.toDateString()}
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex-1">
                          <FormItem>
                            <FormLabel>Total Amount (USDC)</FormLabel>
                            <Input
                              type="number"
                              value={totalAmount.toFixed(2)}
                              disabled
                              className="text-muted-foreground bg-muted cursor-not-allowed"
                            />
                          </FormItem>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </form>
            </Form>
          </div>
        </div>

        <div className="bg-background p-6 absolute bottom-0 left-0 right-0">
          <Button
            type="submit"
            form="payment-request-form"
            className="w-full"
            disabled={isSubmitting || !isFormValid()}
          >
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
