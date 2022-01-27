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
      'i32', // block-size
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
};

const ARCHIVE_OK = 0;

const blockSize = 10240; // taken from docs

function makeCString(str: string): Uint8Array {
  return new Uint8Array([
    ...new TextEncoder().encode(str),
    0,
  ]);
}

export class LibArchive {
  private lib: Deno.DynamicLibrary<typeof symbols>;
  private archive?: Deno.UnsafePointer;

  constructor(libpath: string = defaultLibarchivePath) {
    this.lib = Deno.dlopen(libpath, symbols);
  }

  open(archivePath: string): { errMsg?: string } {
    this.archive = this.lib.symbols.archive_read_new() as Deno.UnsafePointer;
    this.lib.symbols.archive_read_support_filter_all(this.archive);
    this.lib.symbols.archive_read_support_format_all(this.archive);

    const openFilenameResult = this.lib.symbols.archive_read_open_filename(this.archive, makeCString(archivePath), blockSize); 
    if (openFilenameResult !== ARCHIVE_OK) {
      this.close();

      return {
        errMsg: `could not open archive at filepath '${archivePath}'`,
      };
    }

    return {};
  }

  listFiles(): string[] {
    const paths: string[] = [];
    const archive_entry_pointer = new BigUint64Array(1);

    while (this.lib.symbols.archive_read_next_header(this.archive, archive_entry_pointer) === ARCHIVE_OK) {
      const archive_entry = new Deno.UnsafePointer(archive_entry_pointer[0]);
      const filepath = new Deno.UnsafePointerView(this.lib.symbols.archive_entry_pathname(archive_entry) as Deno.UnsafePointer)
        .getCString();
      paths.push(filepath);
      this.lib.symbols.archive_read_data_skip(this.archive);
    }

    return paths;
  }

  close() {
    if (!this.lib) return;

    if (this.archive) this.lib.symbols.archive_read_free(this.archive);

    this.lib.close();
  }
}
