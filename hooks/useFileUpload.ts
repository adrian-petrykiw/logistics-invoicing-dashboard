import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface FileUploadResponse {
  url: string;
  filename: string;
}

export const useFileUpload = (organizationId: string) => {
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadFiles = async (
    files: File[],
    transactionId: string,
    invoiceNumber: string
  ): Promise<FileUploadResponse[]> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("organizationId", organizationId);
      formData.append("transactionId", transactionId);
      formData.append("invoiceNumber", invoiceNumber);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data.files;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFiles, isUploading };
};
