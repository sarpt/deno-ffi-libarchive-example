import * as path from "https://deno.land/std@0.125.0/path/mod.ts";

const defaultLibarchivePath = '/usr/lib/libarchive.so'; // ldconfig aliases path; TODO: either parse ld.so.cache or use ldconfig -p to find this

const symbols = {
  archive_read_new: {
    parameters: [] as Deno.NativeType[],
    result: 'pointer' as Deno.NativeType // struct archive *
  },
  archive_read_support_filter_all: {
    parameters: [
      'pointer', // struct archive *a
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_read_support_format_all: {
    parameters: [
      'pointer', // struct archive *a
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_read_open_filename: {
    parameters: [
      'pointer', // struct archive *
      'pointer', // c-string path
      'u32', // block-size
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType // r
  },
  archive_read_next_header: {
    parameters: [
      'pointer', // struct archive *
      'pointer', // struct archive_entry **
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType // r
  },
  archive_entry_pathname: {
    parameters: [
      'pointer', // struct archive_entry *
    ] as Deno.NativeType[],
    result: 'pointer' as Deno.NativeType // path c-string
  },
  archive_read_data_skip: {
    parameters: [
      'pointer', // struct archive *a
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_read_free: {
    parameters: [
      'pointer', // struct archive *a
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType // r
  },
  archive_write_disk_new: {
    parameters: [] as Deno.NativeType[],
    result: 'pointer' as Deno.NativeType // struct archive *
  },
  archive_write_disk_set_options: {
    parameters: [
      'pointer', // struct archive *
      'i32', // flags
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_write_disk_set_standard_lookup: {
    parameters: [
      'pointer', // struct archive *
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_write_header: {
    parameters: [
      'pointer', // struct archive *
      'pointer', // struct archive_entry **
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType // r
  },
  archive_write_finish_entry: {
    parameters: [
      'pointer', // struct archive *
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType // r
  },
  archive_read_data_block: {
    parameters: [
      'pointer', // struct archive *
      'pointer', // const void **
      'pointer', // size_t * size
      'pointer', // la_int64_t * offset
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType // path c-string
  },
  archive_write_data_block: {
    parameters: [
      'pointer', // struct archive *
      'pointer', // const void *
      'usize', // size_t size
      'u64', // la_int64_t offset
    ] as Deno.NativeType[],
    result: 'i8' as Deno.NativeType // path c-string
  },
  archive_read_close: {
    parameters: [
      'pointer', // struct archive *
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_write_close: {
    parameters: [
      'pointer', // struct archive *
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_write_free: {
    parameters: [
      'pointer', // struct archive *
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType // not sure
  },
  archive_error_string: {
    parameters: [
      'pointer', // struct archive *
    ] as Deno.NativeType[],
    result: 'pointer' as Deno.NativeType // path c-string
  },
  archive_entry_size: {
    parameters: [
      'pointer', // struct archive_entry *
    ] as Deno.NativeType[],
    result: 'usize' as Deno.NativeType // size
  },
  archive_entry_set_pathname: {
    parameters: [
      'pointer', // struct archive_entry *
      'pointer', // c-string path
    ] as Deno.NativeType[],
    result: 'void' as Deno.NativeType
  },
};

enum ARCHIVE_RESULTS {
  OK = 0,
  EOF = 1,
  RETRY = -10,
  WARN = -20,
  FAILED = -25,
  FATAL = -30,
}

enum ARCHIVE_EXTRACT {
  TIME = 0x0004,
  PERM = 0x0002,
  ACL = 0x0020,
  FFLAGS = 0x0040,
}

const blockSize = 10240; // taken from docs

function makeCString(str: string): Uint8Array {
  return new Uint8Array([
    ...new TextEncoder().encode(str),
    0,
  ]);
}

export class LibArchive {
  private lib: Deno.DynamicLibrary<typeof symbols>;

  constructor(libpath: string = defaultLibarchivePath) {
    this.lib = Deno.dlopen(libpath, symbols);
  }

  open(archivePath: string): Deno.UnsafePointer | undefined {
    const archive = this.lib.symbols.archive_read_new() as Deno.UnsafePointer;
    this.lib.symbols.archive_read_support_filter_all(archive);
    this.lib.symbols.archive_read_support_format_all(archive);

    const openFilenameResult = this.lib.symbols.archive_read_open_filename(archive, makeCString(archivePath), blockSize); 
    if (openFilenameResult !== ARCHIVE_RESULTS.OK) {
      this.close();

      return;
    }

    return archive;
  }

  listFiles(archivePath: string): string[] {
    const paths: string[] = [];
    const archive_entry_pointer = new BigUint64Array(1);

    const archive = this.open(archivePath);
    if (!archive) return paths;

    while (this.lib.symbols.archive_read_next_header(archive, archive_entry_pointer) === ARCHIVE_RESULTS.OK) {
      const archive_entry = new Deno.UnsafePointer(archive_entry_pointer[0]);
      const filepath = new Deno.UnsafePointerView(this.lib.symbols.archive_entry_pathname(archive_entry) as Deno.UnsafePointer)
        .getCString();
      paths.push(filepath);
      this.lib.symbols.archive_read_data_skip(archive);
    }

    this.lib.symbols.archive_read_free(archive);

    return paths;
  }

  extractFiles(archivePath: string, outPath: string): { errMsg?: string } {
    const archive = this.open(archivePath);
    if (!archive) return { errMsg: 'archive has not been opened' };

    let r: number;
    const flags = ARCHIVE_EXTRACT.ACL
      | ARCHIVE_EXTRACT.FFLAGS
      | ARCHIVE_EXTRACT.PERM
      | ARCHIVE_EXTRACT.TIME;

    const ext = this.lib.symbols.archive_write_disk_new() as Deno.UnsafePointer;
    this.lib.symbols.archive_write_disk_set_options(ext, flags);
    this.lib.symbols.archive_write_disk_set_standard_lookup(ext);

    const archive_entry_pointer = new BigUint64Array(1);

    while (true) {
      r = this.lib.symbols.archive_read_next_header(archive, archive_entry_pointer) as number;
      if (r === ARCHIVE_RESULTS.EOF)
        break;

      if (r < ARCHIVE_RESULTS.OK)
        console.error(
          new Deno.UnsafePointerView(this.lib.symbols.archive_error_string(archive) as Deno.UnsafePointer)
            .getCString()
        );

      if (r < ARCHIVE_RESULTS.WARN)
        return { errMsg: 'warn returned' };

      const archiveEntry = new Deno.UnsafePointer(archive_entry_pointer[0]);

      const pathname = new Deno.UnsafePointerView(this.lib.symbols.archive_entry_pathname(archiveEntry) as Deno.UnsafePointer).getCString();
      const targetPathname = path.join(outPath, pathname);
      this.lib.symbols.archive_entry_set_pathname(archiveEntry, makeCString(targetPathname));

      r = this.lib.symbols.archive_write_header(ext, archiveEntry) as number;
      if (r < ARCHIVE_RESULTS.OK)
        console.error(
          new Deno.UnsafePointerView(this.lib.symbols.archive_error_string(ext) as Deno.UnsafePointer)
            .getCString()
        );
      else if (this.lib.symbols.archive_entry_size(archiveEntry) as number > 0) {
        r = this.copyData(archive, ext);

        if (r < ARCHIVE_RESULTS.OK)
          console.error(
            new Deno.UnsafePointerView(this.lib.symbols.archive_error_string(archive) as Deno.UnsafePointer)
              .getCString()
          );

        if (r < ARCHIVE_RESULTS.WARN)
          return { errMsg: 'warn returned' };

        }
    }
    
    this.lib.symbols.archive_read_free(archive);
    this.lib.symbols.archive_write_close(ext);
    this.lib.symbols.archive_write_free(ext);

    return {};
  }

  private copyData(ar: Deno.UnsafePointer, aw: Deno.UnsafePointer): number {
    let r: number;
    
    while (true) {
      const buff = new BigUint64Array(1);
      const offset = new Uint32Array(1); // TODO: this should probably be BigUint64Array but deno gets aneurysm when passing BigUInt64
      const size = new Uint32Array(1); // TODO: this should probably be BigUint64Array but deno gets aneurysm when passing BigUInt64

      r = this.lib.symbols.archive_read_data_block(ar, buff, size, offset) as number;
      if (r === ARCHIVE_RESULTS.EOF)
        return ARCHIVE_RESULTS.OK;

      if (r < ARCHIVE_RESULTS.OK)
        return r;

      r = this.lib.symbols.archive_write_data_block(
        aw,
        new Deno.UnsafePointer(buff[0]),
        size[0],
        offset[0],
      ) as number;

      if (r < ARCHIVE_RESULTS.OK) {
        console.error(
          new Deno.UnsafePointerView(this.lib.symbols.archive_error_string(aw) as Deno.UnsafePointer)
            .getCString()
        );

        return r;
      }
    }
  }

  close() {
    if (!this.lib) return;

    this.lib.close();
  }
}
