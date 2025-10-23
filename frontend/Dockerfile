# Dream LMS Frontend Dockerfile
# Multi-stage build for React + Vite application

FROM node:20-alpine as base

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Expose port
EXPOSE 5173

# Run development server with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
