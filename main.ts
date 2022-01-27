import { LibArchive } from "./libarchive.ts";

const archivePath = Deno.args[0];
if (!archivePath) {
  console.error(`archive path not provided`);
  Deno.exit(1);
}

const la = new LibArchive();
const { errMsg } = la.open(archivePath);
if (errMsg) {
  console.error(`error opening archive - ${errMsg}`);
  Deno.exit(1);
}
const paths = la.listFiles();

paths.forEach(path => console.log(path));
la.close();
Deno.exit(0);
