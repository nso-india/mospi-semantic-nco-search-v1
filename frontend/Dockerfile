FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the files
COPY . .

# Build the Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Command to start the application
CMD ["npm", "start"]
