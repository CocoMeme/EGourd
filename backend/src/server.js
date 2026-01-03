// Load environment variables from Render secret file or local .env
const path = require('path');
const fs = require('fs');

// Check for Render's secret file first, then fall back to local .env
const renderSecretPath = '/etc/secrets/.env';
const localEnvPath = path.join(__dirname, '../.env');

if (fs.existsSync(renderSecretPath)) {
  console.log('📦 Loading environment from Render secret file:', renderSecretPath);
  require('dotenv').config({ path: renderSecretPath });
} else if (fs.existsSync(localEnvPath)) {
  console.log('📦 Loading environment from local .env file');
  require('dotenv').config({ path: localEnvPath });
} else {
  console.log('⚠️ No .env file found, using system environment variables');
  require('dotenv').config();
}

const App = require('./app');
const os = require('os');
const validateEnv = require('./config/validateEnv');

const startServer = async () => {
  try {
    validateEnv();

    // Create and initialize the app
    const appInstance = new App();
    const app = await appInstance.initialize();

    // Get port from environment or default to 5000
    const PORT = process.env.PORT || 5000;
    
    // Get network IP address (prioritize WiFi/Ethernet over VM adapters)
    const getLocalIP = () => {
      const interfaces = os.networkInterfaces();
      const priorities = ['Wi-Fi', 'Ethernet', 'en0', 'eth0'];
      
      // First try priority interfaces
      for (const priority of priorities) {
        const iface = interfaces[priority];
        if (iface) {
          for (const addr of iface) {
            if (addr.family === 'IPv4' && !addr.internal) {
              return addr.address;
            }
          }
        }
      }
      
      // Fallback to any non-internal IPv4 that's not a VM adapter
      for (const name of Object.keys(interfaces)) {
        if (name.includes('VirtualBox') || name.includes('VMware') || name.includes('vEthernet')) {
          continue;
        }
        for (const addr of interfaces[name]) {
          if (addr.family === 'IPv4' && !addr.internal && 
              !addr.address.startsWith('169.254')) {
            return addr.address;
          }
        }
      }
      
      return 'localhost';
    };

    const localIP = getLocalIP();
    
    // Start the server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🌟 ========================================');
      console.log('🚀 GOURD CLASSIFICATION API SERVER');
      console.log('🌟 ========================================');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Local API URL: http://localhost:${PORT}/api`);
      console.log(`📱 Mobile API URL: http://${localIP}:${PORT}/api`);
      console.log(`🏥 Health Check: http://${localIP}:${PORT}/api/health`);
      console.log('🌟 ========================================');
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('🔌 HTTP server closed');
        
        // Close database connection
        try {
          const database = require('./config/database');
          await database.disconnect();
        } catch (error) {
          console.error('❌ Error closing database connection:', error);
        }
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('❌ Unhandled Promise Rejection:', err);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('❌ Uncaught Exception:', err);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = startServer;