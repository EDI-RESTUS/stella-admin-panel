module.exports = {
    apps: [
        {
            name: "stella-front",
            cwd: "/home/devadm/projects/stella-admin-panel/",
            script: "./node_modules/.bin/serve",
            args: "-s dist -l 3015",
            interpreter: "none",
            exec_mode: "fork",
            instances: 1,
            // Default Environment Variables
            env: {
                NODE_ENV: "production",
                VITE_API_BASE_URL: "https://dev-api.stella.cy/api/v1", // Default to dev or prod as preferred
            },
            // Staging Environment: pm2 start ecosystem.config.js --env staging
            env_staging: {
                NODE_ENV: "production", // 'serve' is always production usually
                VITE_API_BASE_URL: "https://staging-api.stella.cy/api/v1", // Update this URL
                VITE_COORD_API_URL: "https://staging-coord.restuspos.com"
            },
            watch: false,
            merge_logs: true,
            error_file: "/root/.pm2/logs/stella-web-error.log",
            out_file: "/root/.pm2/logs/stella-web-out.log",
            max_memory_restart: "300M"
        }
    ]
};
