import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    try {
      const profileDir = join(getProfilesDir(), "profiles");
      const targetDir = join(
        process.env.HOME || process.env.USERPROFILE || "~",
        ".pi",
        "profiles"
      );

      // Ensure target directory exists
      await mkdir(targetDir, { recursive: true });

      // Read all profile files from the package
      const entries = await readdirSafe(profileDir);
      const jsonFiles = entries.filter((f) => f.endsWith(".json"));

      let installedCount = 0;
      for (const file of jsonFiles) {
        const srcPath = join(profileDir, file);
        const dstPath = join(targetDir, file);

        // Read source profile
        const content = await readFile(srcPath, "utf-8");
        const profile = JSON.parse(content);

        // Validate basic structure
        if (!profile.name) {
          ctx.ui.notify(`Skipping ${file}: missing "name" field`, "warn");
          continue;
        }

        // Write to ~/.pi/profiles/
        await writeFile(dstPath, JSON.stringify(profile, null, 2) + "\n");
        installedCount++;
      }

      if (installedCount > 0) {
        ctx.ui.notify(
          `✅ pi-profile: ${installedCount} profile(s) installed → ${targetDir}`,
          "info"
        );
        ctx.ui.notify(
          "💡 Usage: pi --profile <name>  or  /profile <name> inside pi",
          "info"
        );
      }
    } catch (err) {
      ctx.ui.notify(
        `⚠️ pi-profile: install error — ${err instanceof Error ? err.message : String(err)}`,
        "warn"
      );
    }
  });
}

function getProfilesDir(): string {
  // When loaded as a pi package from npm, the extension lives at:
  //   <package_root>/extensions/index.ts
  // Package root is two levels up from __dirname
  const pkgRoot = join(__dirname, "..");
  return pkgRoot;
}

async function readdirSafe(dir: string): Promise<string[]> {
  try {
    const { readdir } = await import("node:fs/promises");
    return await readdir(dir);
  } catch {
    return [];
  }
}
