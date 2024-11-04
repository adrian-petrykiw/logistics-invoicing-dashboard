// import { useMutation } from "@tanstack/react-query";
// import { useToast } from "@/hooks/useToast";

// export const useAuth = () => {
//   const { isConnected, address } = useParticleProvider();
//   const { connect, disconnect } = useParticleConnect();
//   const { createControlledMultisig } = useSquadsSDK();
//   const { toast } = useToast();

//   const createMultisig = useMutation({
//     mutationFn: async () => {
//       if (!address) throw new Error("No wallet connected");

//       return createControlledMultisig({
//         creator: address,
//         configAuthority: address,
//       });
//     },
//     onSuccess: () => {
//       toast({
//         title: "Success",
//         description: "Multisig wallet created successfully",
//       });
//     },
//     onError: (error) => {
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description: error.message,
//       });
//     },
//   });

//   return {
//     isAuthenticated: isConnected,
//     address,
//     connect,
//     disconnect,
//     createMultisig,
//   };
// };
