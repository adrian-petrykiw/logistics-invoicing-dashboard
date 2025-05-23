import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarIcon,
  CaretSortIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useFieldArray, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import {
  useVendorSelection,
  useAvailableVendors,
} from "@/hooks/useVendorSelection";
import { VendorListItem } from "@/types/vendor";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  CombinedFormValues,
  CombinedVendorFormProps,
  createCombinedSchema,
} from "@/schemas/combinedform";
import { Skeleton } from "@/components/ui/skeleton";

const CombinedVendorForm = ({
  onNext,
  userWalletAddress,
  availableVendors,
  isVendorsLoading,
  vendorsError,
  refetchVendors,
}: CombinedVendorFormProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  const {
    data: vendorDetails,
    isLoading: isVendorLoading,
    refetch,
  } = useVendorSelection(selectedVendor);

  const filteredVendors = availableVendors.filter((vendor) =>
    vendor.name.toLowerCase().includes(query.toLowerCase())
  );

  const form = useForm<CombinedFormValues>({
    resolver: zodResolver(
      createCombinedSchema(vendorDetails?.business_details.customFields)
    ),
    defaultValues: {
      vendor: "",
      invoices: [{ number: "", amount: 0 }],
      relatedBolAwb: "",
      paymentDate: new Date(),
      additionalInfo: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "invoices",
  });

  const totalAmount = form
    .watch("invoices")
    .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

  const onSubmit = (data: CombinedFormValues) => {
    const enrichedData = {
      ...data,
      amount: totalAmount,
      sender: userWalletAddress,
      receiver: vendorDetails?.business_details.companyAddress || "",
    };
    onNext(enrichedData);
  };

  // At the top of your component
  useEffect(() => {
    console.log("CombinedVendorForm mounted");
    console.log("User wallet address:", userWalletAddress);
  }, [userWalletAddress]);

  useEffect(() => {
    console.log("Available vendors updated:", availableVendors);
    console.log("Vendors loading:", isVendorsLoading);
  }, [availableVendors, isVendorsLoading]);

  useEffect(() => {
    if (selectedVendor) {
      console.log("Selected vendor details:", vendorDetails);
      console.log("Vendor loading:", isVendorLoading);
    }
  }, [selectedVendor, vendorDetails, isVendorLoading]);

  if (isVendorsLoading) {
    return (
      <div className="flex flex-col space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!isVendorsLoading && vendorsError) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-500 mb-4">
          {vendorsError instanceof Error
            ? vendorsError.message
            : "Failed to load vendors"}
        </p>
        <Button onClick={() => refetchVendors()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto pb-10 mb-10">
          <form
            id="vendor-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pb-10"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem className="md:flex md:flex-col md:justify-end">
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
                            {field.value
                              ? availableVendors.find(
                                  (vendor: VendorListItem) =>
                                    vendor.id === field.value
                                )?.name
                              : "Select vendor"}
                            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                      >
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
                              {isVendorsLoading ? (
                                <div className="p-4">
                                  <Skeleton className="h-5 w-full" />
                                </div>
                              ) : (
                                filteredVendors.map(
                                  (vendor: VendorListItem) => (
                                    <CommandItem
                                      key={vendor.id}
                                      value={vendor.id}
                                      onSelect={() => {
                                        form.setValue("vendor", vendor.id);
                                        setSelectedVendor(vendor.id);
                                        setOpen(false);
                                        setQuery("");
                                      }}
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
                                  )
                                )
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
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  {!selectedVendor ? (
                    <div className="text-sm text-muted-foreground justify-center p-4 items-center text-center">
                      Please select a vendor to view details
                    </div>
                  ) : isVendorLoading ? (
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
                      <p className="text-xs text-muted-foreground">
                        {vendorDetails.business_details.companyPhone}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            {selectedVendor && vendorDetails && (
              <div className="space-y-4">
                <div className="space-y-4">
                  <div className="flex mb-[-12px] gap-6">
                    <div className="w-[50%] ">
                      <FormLabel>Invoices</FormLabel>
                    </div>
                    <div
                      className={`w-[50%]  ${
                        fields.length > 1 ? `mr-[3px]` : `mr-16`
                      }`}
                    >
                      <FormLabel
                        className={`text-sm text-muted-foreground w-full flex `}
                      >
                        Amount (USDC)
                      </FormLabel>
                    </div>
                    {fields.length > 1 && <div className="w-10" />}
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="space-y-2">
                      <div className="flex gap-6 w-full">
                        <FormField
                          control={form.control}
                          name={`invoices.${index}.number`}
                          render={({ field }) => (
                            <FormItem className="w-[50%]">
                              <FormControl>
                                <Input
                                  placeholder="Enter invoice number"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`invoices.${index}.amount`}
                          render={({ field }) => (
                            <FormItem className="w-[50%]">
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(parseFloat(e.target.value))
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <button
                          type="button"
                          disabled={index == 0}
                          onClick={() => remove(index)}
                          className={`w-10 flex-shrink-0 hover:opacity-70 transition-opacity`}
                        >
                          <TrashIcon
                            className={`h-5 w-5  ${
                              index == 0 ? "text-gray-300" : "text-black"
                            }`}
                          />
                        </button>
                      </div>
                      {index === fields.length - 1 && (
                        <button
                          type="button"
                          onClick={() => append({ number: "", amount: 0 })}
                          className="w-full text-center pt-2 text-sm text-muted-foreground hover:text-black transition-colors flex items-center justify-center gap-2"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Add Another Invoice
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {vendorDetails.business_details.customFields?.map((field) => (
                  <FormField
                    key={field.key}
                    control={form.control}
                    name={field.key}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>{field.name}</FormLabel>
                        <FormControl>
                          <Input
                            type={field.type === "number" ? "number" : "text"}
                            placeholder={`Enter ${field.name.toLowerCase()}`}
                            required={field.required}
                            {...formField}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}

                <FormField
                  control={form.control}
                  name="additionalInfo"
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

                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="date"
                              value={field.value.toISOString().split("T")[0]}
                              disabled
                              className="text-muted-foreground bg-muted cursor-not-allowed"
                            />
                            <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>Total Amount (USDC)</FormLabel>
                    <Input
                      type="number"
                      value={totalAmount.toFixed(2)}
                      disabled
                      className="text-muted-foreground bg-muted cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-background mt-auto">
          <Button
            type="submit"
            form="vendor-form"
            className="w-full"
            disabled={isVendorLoading || !selectedVendor}
          >
            Next
          </Button>
        </div>
      </div>
    </Form>
  );
};

export default CombinedVendorForm;
