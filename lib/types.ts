export type Item = {id:string;description:string;hsn:string;quantity:string;unit:string;rate:string;amountOverride:string|null};
export type Address = {id:string;label:string;details:string};
export type Invoice = {id:string;number:string;date:string;autoDate:boolean;recipientId:string;recipient:string;supplyId:string;supply:string;items:Item[];gst:string;savedAt?:string};
export type Workspace = {schemaVersion:number;recipients:Address[];supplies:Address[];invoices:Invoice[];draft:Invoice};
