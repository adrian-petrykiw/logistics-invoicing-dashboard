import { NextApiRequest, NextApiResponse } from "next";
import formidable, { Fields, Files, File as FormidableFile } from "formidable";
import { Storage } from "@google-cloud/storage";
import fs from "fs/promises";

export const config = {
  api: {
    bodyParser: false,
  },
};

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || ""),
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET || "");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable({ multiples: true });
    const { fields, files } = await new Promise<{
      fields: Fields;
      files: Files;
    }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    const organizationId = fields.organizationId?.[0] || fields.organizationId;
    const transactionId = fields.transactionId?.[0] || fields.transactionId;
    const invoiceNumber = fields.invoiceNumber?.[0] || fields.invoiceNumber;

    if (!files.files) {
      throw new Error("No files uploaded");
    }

    const uploadedFiles = Array.isArray(files.files)
      ? files.files
      : [files.files];

    const uploadPromises = uploadedFiles.map(async (file) => {
      if (!file.originalFilename) {
        throw new Error("File name is required");
      }

      const fileName = `${organizationId}/${transactionId}/${invoiceNumber}/${file.originalFilename}`;
      const blob = bucket.file(fileName);

      const fileContent = await fs.readFile(file.filepath);
      await blob.save(fileContent);

      const [url] = await blob.getSignedUrl({
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        url,
        filename: file.originalFilename,
      };
    });

    const results = await Promise.all(uploadPromises);
    res.status(200).json({ files: results });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
}
