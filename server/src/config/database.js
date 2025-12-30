const mongoose = require('mongoose');
const config = require('./index');

/**
 * MongoDB Connection Manager
 * Handles connection, reconnection, and graceful shutdown
 */
class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000;
  }

  async connect() {
    if (this.isConnected) {
      console.log('📦 Using existing database connection');
      return;
    }

    try {
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4
      };

      mongoose.set('strictQuery', true);
      
      await mongoose.connect(config.MONGODB_URI, options);
      
      this.isConnected = true;
      this.retryAttempts = 0;
      console.log('✅ MongoDB connected successfully');

      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      await this.handleConnectionError();
    }
  }

  setupEventHandlers() {
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB error:', error.message);
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      this.isConnected = true;
    });

    // Graceful shutdown handlers
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
  }

  async handleConnectionError() {
    if (this.retryAttempts < this.maxRetries) {
      this.retryAttempts++;
      console.log(`🔄 Retrying connection (${this.retryAttempts}/${this.maxRetries}) in ${this.retryDelay / 1000}s...`);
      
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      return this.connect();
    }
    
    console.error('❌ Max retry attempts reached. Exiting...');
    process.exit(1);
  }

  async gracefulShutdown(signal) {
    console.log(`\n📴 ${signal} received. Closing MongoDB connection...`);
    
    try {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error.message);
      process.exit(1);
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  }
}

module.exports = new DatabaseConnection();
