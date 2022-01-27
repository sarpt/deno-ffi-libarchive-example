example of how to use libarchive.so with Deno's FFI - at the moment only listing of files in archive implemented

## requirements

- distro with `libarchive.so` in standard `ldconfing` path
- deno 1.17 & up

## running

`deno run --unstable --allow-ffi ./main.ts <archive path>`