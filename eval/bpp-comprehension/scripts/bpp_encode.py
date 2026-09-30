#!/usr/bin/env python3
# Throwaway bpp arm for the generic comprehension eval. NOT committed to any repo.
# stdin: JSON -> stdout: bpp encoding.
#   --norefs    : encode with refs=False (isolate delimiter squeeze from pointer table)
#   --roundtrip : encode then decode, assert deep-equal; exit 1 on mismatch.
import sys, json, bpp
def main():
    raw = sys.stdin.read()
    obj = json.loads(raw)
    refs = "--norefs" not in sys.argv
    enc = bpp.encode(obj, refs=refs)
    if "--roundtrip" in sys.argv:
        if bpp.decode(enc) != obj:
            sys.stderr.write("ROUND-TRIP FAILED (refs=%s)\n" % refs); sys.exit(1)
        sys.stderr.write("ROUND-TRIP OK (refs=%s): %d->%d bytes\n" % (refs,len(raw),len(enc))); return
    sys.stdout.write(enc)
if __name__ == "__main__":
    main()
