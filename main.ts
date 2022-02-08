import { LibArchive } from "./libarchive.ts";
import * as path from "https://deno.land/std@0.125.0/path/mod.ts";

const archivePath = Deno.args[0];
if (!archivePath) {
  console.error(`archive path not provided`);
  Deno.exit(1);
}

const la = new LibArchive();

const paths = la.listFiles(archivePath);
paths.forEach(path => console.log(path));


let outPath = Deno.args[1];
if (!outPath) {
  outPath = path.dirname(archivePath);
  console.info(`no out path provided - extracting to '${outPath}'`);
}

const extractResult = la.extractFiles(archivePath, outPath)
if (extractResult.errMsg) {
  console.error(`error extracting archive - ${extractResult.errMsg}`);
  Deno.exit(1);
}

la.close();
Deno.exit(0);
