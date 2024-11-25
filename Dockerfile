# Use the official Node.js image as the base image
FROM --platform=linux/amd64 node:20-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with specific npm settings for Cloud Run
RUN npm install --legacy-peer-deps --production=false

# Copy the rest of the application files
COPY . .

# Set environment variables for Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js app
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Expose port for Cloud Run
ENV PORT 8080
EXPOSE 8080

# Update start command to use the PORT environment variable
CMD ["sh", "-c", "npm start -- -p ${PORT}"]