// import { useEffect } from "react";
// import { useRouter } from "next/router";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// // import { useParticleConnect } from "@particle-network/connectkit";
// import { FcGoogle } from "react-icons/fc";
// import { MdEmail } from "react-icons/md";
// // import { useAuth } from "../hooks/useAuth";

// interface SignupModalProps {
//   isOpen: boolean;
//   onClose: () => void;
// }

// export function SignupModal({ isOpen, onClose }: SignupModalProps) {
//   const router = useRouter();
//   const { connect } = useParticleConnect();
//   const { createMultisig, isAuthenticated } = useAuth();

//   useEffect(() => {
//     if (isAuthenticated) {
//       createMultisig.mutate(undefined, {
//         onSuccess: () => {
//           router.push("/dashboard");
//         },
//       });
//     }
//   }, [isAuthenticated, router, createMultisig]);

//   const handleLogin = async (method: "google" | "email") => {
//     try {
//       await connect({ connector: method });
//     } catch (error) {
//       console.error("Login failed:", error);
//     }
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="sm:max-w-md">
//         <DialogHeader>
//           <DialogTitle className="text-2xl font-bold">
//             Create an account
//           </DialogTitle>
//         </DialogHeader>

//         <div className="flex flex-col gap-4 py-6">
//           <Button
//             variant="outline"
//             className="w-full flex items-center justify-center gap-2"
//             onClick={() => handleLogin("google")}
//           >
//             <FcGoogle className="w-5 h-5" />
//             Continue with Google
//           </Button>

//           <div className="relative">
//             <div className="absolute inset-0 flex items-center">
//               <span className="w-full border-t" />
//             </div>
//             <div className="relative flex justify-center text-sm">
//               <span className="px-2 bg-background text-muted-foreground">
//                 OR CONTINUE WITH
//               </span>
//             </div>
//           </div>

//           <Button
//             variant="outline"
//             className="w-full flex items-center justify-center gap-2"
//             onClick={() => handleLogin("email")}
//           >
//             <MdEmail className="w-5 h-5" />
//             Continue with Email
//           </Button>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }
