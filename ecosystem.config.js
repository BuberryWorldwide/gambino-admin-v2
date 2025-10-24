module.exports = {
  apps: [{
    name: 'gambino-admin-v2',
    script: 'npm',
    args: 'start',
    cwd: '/opt/gambino-admin-v2',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
