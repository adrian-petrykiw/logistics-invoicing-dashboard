# Use the official Node.js image as the base image
FROM --platform=linux/amd64 node:20-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application files
COPY . .

# Set a default RPC URL for build time
ENV NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Build the Next.js app
RUN npm run build

# Expose port 3000 for the application
EXPOSE 3000

# Set the environment variable for production
ENV NODE_ENV=production

# Start the Next.js application
CMD ["npm", "start"]
