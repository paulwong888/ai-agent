const core = require("/home/node/.pi/agent/npm/node_modules/pi-psql/core");

const name = process.env.PG_CONN_NAME || "paul-db";
const conn = {
  host: process.env.PG_HOST || "host.docker.internal",
  port: Number(process.env.PG_PORT || 5432),
  database: process.env.PG_DATABASE || "paul_db",
  user: process.env.PG_USER || "paul",
  password: process.env.PG_PASSWORD || "n8n_pass_!",
  ssl: false,
  sslMode: "disable",
};

try {
  core.removeConnection(name);
} catch {}

core.addConnection(name, conn);
core.setDefault(name);
console.log(JSON.stringify(core.listConnections(), null, 2));
