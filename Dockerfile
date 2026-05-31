FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev for build if needed)
RUN npm install

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads fonts

# Expose port (Railway sets PORT env var)
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]
