import { LibArchive } from "./libarchive.ts";

const archivePath = Deno.args[0];
if (!archivePath) {
  console.error(`archive path not provided`);
  Deno.exit(1);
}

const la = new LibArchive();

const paths = la.listFiles(archivePath);
paths.forEach(path => console.log(path));

const extractResult = la.extractFiles(archivePath)
if (extractResult.errMsg) {
  console.error(`error extracting archive - ${extractResult.errMsg}`);
  Deno.exit(1);
}

la.close();
Deno.exit(0);
