import fs from "node:fs/promises";

const contents = await fs.readFile("dist/enum.d.ts", "utf-8");
await fs.writeFile("dist/enum.d.ts", contents.replace("#private;", `#brand: Read<Config, 'Brand', string>;`));
