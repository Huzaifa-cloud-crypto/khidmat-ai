# Use the official Node.js 20 image
FROM node:20-slim

# Set the working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy the rest of the application code
COPY backend/ ./backend/
COPY mobile_web/ ./mobile_web/

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Start the application
CMD ["node", "backend/src/server.js"]
