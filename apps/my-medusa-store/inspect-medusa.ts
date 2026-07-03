import { container } from "@medusajs/framework";
import { MedusaApp } from "@medusajs/framework/modules-sdk";
import { Modules } from "@medusajs/framework/utils";

async function inspectModules() {
    console.log("🚀 Initializing Medusa container for introspection...\n");

    // 1. Initialize the minimal Medusa app context to get the container
    // const { container } = await MedusaApp();

    // 2. List of core modules you want to inspect
    const modulesToInspect = [
        { name: "Product Module", alias: Modules.PRODUCT },
        { name: "Cart Module", alias: Modules.CART },
        { name: "Customer Module", alias: Modules.CUSTOMER },
        { name: "Pricing Module", alias: Modules.PRICING },
        { name: "Promotion Module", alias: Modules.PROMOTION },
    ];

    // 3. Loop through and dynamically extract all exact method names
    for (const mod of modulesToInspect) {
        try {
            const service = container.resolve(mod.alias);

            // Extract methods from both the instance and its prototype chain
            const prototypeKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(service));
            const instanceKeys = Object.keys(service);

            // Merge and filter out standard internal JS properties or private methods
            const allMethods = Array.from(new Set([...prototypeKeys, ...instanceKeys]))
                .filter(key => typeof service[key] === "function" && !key.startsWith("_"))
                .sort();

            console.log(`=========================================`);
            console.log(`📦 ${mod.name} (${mod.alias})`);
            console.log(`=========================================`);
            if (allMethods.length === 0) {
                console.log("No public methods found (or module fully proxied).");
            } else {
                allMethods.forEach(method => console.log(`  🔹 ${method}()`));
            }
            console.log("\n");

        } catch (error) {
            console.log(`❌ Could not resolve module: ${mod.name} (${mod.alias}). Make sure it is configured in medusa-config.js.\n`);
        }
    }

    // Gracefully exit the process
    process.exit(0);
}

inspectModules();