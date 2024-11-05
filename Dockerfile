# Use the official Node.js image as the base image
FROM --platform=linux/amd64 node:20-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the Next.js app
RUN npm run build

# The port that Cloud Run will use
ENV PORT=8080
EXPOSE 8080

# Set the environment variable for production
ENV NODE_ENV=production

# Start the Next.js application
CMD ["npm", "start"]