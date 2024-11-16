import { PublicKey } from "@solana/web3.js";

export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

// import { Organization } from "@/schemas/organization";

// export const MOCK_VENDORS: Record<string, Organization> = {
//   // Shipping Lines
//   "hapag-lloyd": {
//     id: "hapag-lloyd",
//     business_details: {
//       companyName: "HAPAG-LLOYD (AMERICA) LLC",
//       companyAddress: "3 RAVINIA DRIVE SUITE 1600 ATLANTA, GA 30346 USA",
//       companyPhone: "1 855 227-4612",
//       companyEmail: "support@hapag-lloyd.com",
//       ownerName: "main",
//       ownerEmail: "support@hapag-lloyd.com",
//       ownerWalletAddress: "",
//     },
//     customFields: [
//       {
//         name: "Bill of Lading Number",
//         required: true,
//         type: "text",
//         key: "bolNumber",
//       },
//       {
//         name: "Container Number",
//         required: true,
//         type: "text",
//         key: "containerNumber",
//       },
//     ],
//   },
//   "cma-cgm": {
//     id: "cma-cgm",
//     name: "CMA CGM (America) LLC",
//     address: "1 CMA CGM WAY 23502 NORFOLK, VA USA",
//     phone: "1 757 961 2100",
//     email: "support@cma-cgm.com",
//     type: "shipping",
//     customFields: [
//       {
//         name: "Bill of Lading Number",
//         required: true,
//         type: "text",
//         key: "bolNumber",
//       },
//       {
//         name: "Container Number",
//         required: true,
//         type: "text",
//         key: "containerNumber",
//       },
//     ],
//   },
//   maersk: {
//     id: "maersk",
//     name: "MAERSK",
//     address:
//       "180 Park Avenue, Building 105, PO Box 950 Florham Park, NJ 07932 USA",
//     phone: "1 800 321 8807",
//     email: "support@maersk.com",
//     type: "shipping",
//     customFields: [
//       {
//         name: "Bill of Lading Number",
//         required: true,
//         type: "text",
//         key: "bolNumber",
//       },
//       {
//         name: "Container Number",
//         required: true,
//         type: "text",
//         key: "containerNumber",
//       },
//     ],
//   },

//   // Airlines
//   "united-cargo": {
//     id: "united-cargo",
//     name: "United Airlines Cargo",
//     address: "900 Grand Plaza Drive Houston, Texas 77067 USA",
//     phone: "(800) 822 2746",
//     email: "cargo@united.com",
//     type: "airline",
//     customFields: [
//       {
//         name: "Air Waybill Number",
//         required: true,
//         type: "text",
//         key: "awbNumber",
//       },
//       {
//         name: "Flight Number",
//         required: false,
//         type: "text",
//         key: "flightNumber",
//       },
//     ],
//   },
//   "turkish-cargo": {
//     id: "turkish-cargo",
//     name: "Turkish Airlines Cargo - Istanbul",
//     address:
//       "Tayakadın Mahallesi, Türk Hava Yolları Kargo Uydu Terminali Istanbul Havalimanı, Arnavutköy 34283",
//     phone: "+90 850 333 07 77",
//     email: "cargo@thy.com",
//     type: "airline",
//     customFields: [
//       {
//         name: "Air Waybill Number",
//         required: true,
//         type: "text",
//         key: "awbNumber",
//       },
//       {
//         name: "Flight Number",
//         required: false,
//         type: "text",
//         key: "flightNumber",
//       },
//     ],
//   },
//   "lufthansa-cargo": {
//     id: "lufthansa-cargo",
//     name: "Lufthansa Cargo - Germany",
//     address:
//       "Frankfurt Airport, Gate 21. Building 322 D-60546 Frankfurt am Main",
//     phone: "+49 69 696 0",
//     email: "cargo@lufthansa.com",
//     type: "airline",
//     customFields: [
//       {
//         name: "Air Waybill Number",
//         required: true,
//         type: "text",
//         key: "awbNumber",
//       },
//       {
//         name: "Flight Number",
//         required: false,
//         type: "text",
//         key: "flightNumber",
//       },
//     ],
//   },

//   // Forwarders
//   dcl: {
//     id: "dcl",
//     name: "Direct Container Line (DCL)",
//     address: "300 Middlesex Avenue New Jersey 07008 USA",
//     phone: "(732) 969-8800",
//     email: "info@dcl.com",
//     type: "forwarder",
//     customFields: [
//       {
//         name: "House Bill Number",
//         required: true,
//         type: "text",
//         key: "hblNumber",
//       },
//       {
//         name: "Master Bill Number",
//         required: false,
//         type: "text",
//         key: "mblNumber",
//       },
//     ],
//   },
//   ecu: {
//     id: "ecu",
//     name: "ECU Worldwide",
//     address: "2401 NW 69th Street Miami, FL 33147",
//     phone: "(305) 693-5133",
//     email: "info@ecuworldwide.com",
//     type: "forwarder",
//     customFields: [
//       {
//         name: "House Bill Number",
//         required: true,
//         type: "text",
//         key: "hblNumber",
//       },
//       {
//         name: "Master Bill Number",
//         required: false,
//         type: "text",
//         key: "mblNumber",
//       },
//     ],
//   },
//   "cpw-singapore": {
//     id: "cpw-singapore",
//     name: "CP World - Singapore",
//     address: "2 Bukit Merah Central #20-01 Singapore 159835",
//     phone: "+65 6535 6523",
//     email: "singapore@cpworld.com",
//     type: "forwarder",
//     customFields: [
//       {
//         name: "House Bill Number",
//         required: true,
//         type: "text",
//         key: "hblNumber",
//       },
//       {
//         name: "Master Bill Number",
//         required: false,
//         type: "text",
//         key: "mblNumber",
//       },
//     ],
//   },
//   "cpw-hongkong": {
//     id: "cpw-hongkong",
//     name: "CP World - Hong Kong",
//     address:
//       "Unit 1605-06, 16/F Port 33, 33 Tseuk Luk Street, San Po Kong Kowloon, Hong Kong",
//     phone: "852 3971 4168",
//     email: "hongkong@cpworld.com",
//     type: "forwarder",
//     customFields: [
//       {
//         name: "House Bill Number",
//         required: true,
//         type: "text",
//         key: "hblNumber",
//       },
//       {
//         name: "Master Bill Number",
//         required: false,
//         type: "text",
//         key: "mblNumber",
//       },
//     ],
//   },
//   "cpw-dubai": {
//     id: "cpw-dubai",
//     name: "CP World - Dubai",
//     address:
//       "P.O. Box 35645, UMM Hurair Building, Mezzanine Floor Room #2 & 3, Opp to Civil Defence Building, Karama, Dubai, UAE",
//     phone: "(971-4) 334 3300",
//     email: "dubai@cpworld.com",
//     type: "forwarder",
//     customFields: [
//       {
//         name: "House Bill Number",
//         required: true,
//         type: "text",
//         key: "hblNumber",
//       },
//       {
//         name: "Master Bill Number",
//         required: false,
//         type: "text",
//         key: "mblNumber",
//       },
//     ],
//   },

//   // Warehouses
//   arrowpac: {
//     id: "arrowpac",
//     name: "Arrowpac",
//     address: "101 Dollar Tree Ln, Joliet, IL 60436",
//     phone: "(630) 378-0041",
//     email: "info@arrowpac.com",
//     type: "warehouse",
//     customFields: [
//       {
//         name: "Warehouse Receipt Number",
//         required: true,
//         type: "text",
//         key: "receiptNumber",
//       },
//       {
//         name: "Storage Location",
//         required: false,
//         type: "text",
//         key: "storageLocation",
//       },
//     ],
//   },
//   "wfs-atl": {
//     id: "wfs-atl",
//     name: "Worldwide Flight Services (ATL)",
//     address: "4400 S Cargo Dr Atlanta, GA 30337",
//     phone: "404 492 7333",
//     email: "info@wfs.com",
//     type: "warehouse",
//     customFields: [
//       {
//         name: "Warehouse Receipt Number",
//         required: true,
//         type: "text",
//         key: "receiptNumber",
//       },
//       {
//         name: "Storage Location",
//         required: false,
//         type: "text",
//         key: "storageLocation",
//       },
//     ],
//   },
// };
