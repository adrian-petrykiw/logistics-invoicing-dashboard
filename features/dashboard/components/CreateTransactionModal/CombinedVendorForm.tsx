import { zodResolver } from "@hookform/resolvers/zod";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { useForm, Controller } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
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

const vendorOptions = [
  { label: "Vendor 1 - Charlotte USA", value: "vendor1" },
  { label: "Vendor 2 - Canada", value: "vendor2" },
  { label: "Vendor 3 - India", value: "vendor3" },
];

// Combined schema for both forms
const combinedSchema = z.object({
  vendor: z.string().min(1, "Please select a vendor"),
  billOfLading: z.string().min(1, "Bill of Lading is required"),
  sender: z.string().min(1, "Sender is required"),
  receiver: z.string().min(1, "Receiver is required"),
  paymentStatus: z.string(),
  amount: z.number().min(0),
  paymentMethod: z.string(),
  approvalDate: z.string(),
  processedDate: z.string(),
  direction: z.string(),
  origin: z.string(),
  destination: z.string(),
});

type CombinedFormValues = z.infer<typeof combinedSchema>;

export function CombinedVendorForm({
  onNext,
}: {
  onNext: (data: CombinedFormValues) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");

  const form = useForm<CombinedFormValues>({
    resolver: zodResolver(combinedSchema),
    defaultValues: {
      vendor: "",
      billOfLading: "",
      sender: "",
      receiver: "",
      paymentStatus: "pending",
      amount: 0,
      paymentMethod: "crypto",
      approvalDate: "",
      processedDate: "",
      direction: "inbound",
      origin: "",
      destination: "",
    },
  });

  const onSubmit = (data: CombinedFormValues) => {
    console.log(data);
    onNext(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="pt-4">
          <FormField
            control={form.control}
            name="vendor"
            render={({ field }) => (
              <FormItem className="mb-6">
                <FormLabel>Select Vendor</FormLabel>
                <Popover>
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
                          ? vendorOptions.find(
                              (vendor) => vendor.value === field.value
                            )?.label
                          : "Select vendor"}
                        <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[85.5vw] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search vendor..."
                        className="h-9"
                        onInput={(e: { currentTarget: { value: any } }) =>
                          setQuery(e.currentTarget.value)
                        }
                      />
                      <CommandList>
                        <CommandEmpty>No vendor found.</CommandEmpty>
                        <CommandGroup>
                          {vendorOptions
                            .filter((vendor) =>
                              vendor.label
                                .toLowerCase()
                                .includes(query.toLowerCase())
                            )
                            .map((vendor) => (
                              <CommandItem
                                key={vendor.value}
                                onSelect={() => {
                                  form.setValue("vendor", vendor.value);
                                  setSelectedVendor(vendor.value);
                                }}
                              >
                                {vendor.label}
                                <CheckIcon
                                  className={`ml-auto h-4 w-4 ${
                                    vendor.value === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Bill of Lading form fields - only shown after vendor selection */}
        {selectedVendor && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="billOfLading"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill of Lading #</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Bill of Lading #" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sender</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter sender" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiver"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receiver</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter receiver" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origin</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter origin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter destination" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full mt-6">
              Next
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}

export default CombinedVendorForm;
