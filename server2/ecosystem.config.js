module.exports = {
    apps: [{
        name: "jeewallah-api",
        script: "index.js",
        instances: "max",          // Use all CPU cores
        exec_mode: "cluster",      // Cluster mode
        max_memory_restart: "500M",
        env: {
            NODE_ENV: "development",
            PORT: 3000
        },
        env_production: {
            NODE_ENV: "production",
            PORT: 3000
        },
        // Logging
        log_date_format: "YYYY-MM-DD HH:mm:ss Z",
        error_file: "./logs/pm2-error.log",
        out_file: "./logs/pm2-out.log",
        merge_logs: true,
        // Auto-restart
        watch: false,
        max_restarts: 10,
        restart_delay: 5000,
        // Graceful shutdown
        kill_timeout: 5000,
        listen_timeout: 10000
    }]
};
