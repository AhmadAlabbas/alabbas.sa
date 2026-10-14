import { existsSync } from "node:fs";
import { portalConfig } from "../src/lib/portal/config";
import { portalEnabled } from "../src/lib/portal/feature";
if (existsSync(".env")) process.loadEnvFile(".env");
if (!portalEnabled())
  throw new Error(
    "Use npm run build while the portal is disabled. build:portal requires PORTAL_ENABLED=true.",
  );
portalConfig();
console.log(
  "Portal configuration names and formats validated; values are not logged.",
);
