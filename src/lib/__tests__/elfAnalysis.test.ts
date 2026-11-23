import { ElfParseError, parseElf, resolveAddress } from "../elfAnalysis";

const textEncoder = new TextEncoder();

function encodeULEB128(value: number): number[] {
  const bytes: number[] = [];
  let v = value >>> 0;
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (v !== 0);
  return bytes;
}

function encodeSLEB128(value: number): number[] {
  const bytes: number[] = [];
  let v = value;
  let more = true;
  while (more) {
    let byte = v & 0x7f;
    v >>= 7;
    if ((v === 0 && (byte & 0x40) === 0) || (v === -1 && (byte & 0x40) !== 0)) {
      more = false;
    } else {
      byte |= 0x80;
    }
    bytes.push(byte);
  }
  return bytes;
}

interface SyntheticSection {
  name: string;
  type: number;
  data: Uint8Array;
  link?: number;
  entsize?: number;
}

function buildElf32(
  sections: SyntheticSection[],
  overrides?: { e_shentsize?: number; corruptSectionOffset?: number },
): ArrayBuffer {
  // Build .shstrtab containing "" and all section names + ".shstrtab".
  const allNames = ["", ...sections.map((s) => s.name), ".shstrtab"];
  const nameOffsets = new Map<string, number>();
  const shstrParts: number[] = [];
  for (const name of allNames) {
    nameOffsets.set(name, shstrParts.length);
    for (const b of textEncoder.encode(name)) shstrParts.push(b);
    shstrParts.push(0);
  }
  const shstrtabData = new Uint8Array(shstrParts);

  const allSections: SyntheticSection[] = [
    { name: "", type: 0, data: new Uint8Array(0) },
    ...sections,
    { name: ".shstrtab", type: 3, data: shstrtabData },
  ];

  const headerSize = 52;
  const shentsize = overrides?.e_shentsize ?? 40;
  const dataStart = headerSize;
  const sectionOffsets: number[] = [];
  let cursor = dataStart;
  for (const sec of allSections) {
    sectionOffsets.push(cursor);
    cursor += sec.data.length;
  }
  const shoff = cursor;
  const totalSize = shoff + allSections.length * Math.max(shentsize, 40);
  const buf = new ArrayBuffer(totalSize);
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);

  // ELF32 little-endian header
  bytes[0] = 0x7f;
  bytes[1] = 0x45;
  bytes[2] = 0x4c;
  bytes[3] = 0x46;
  bytes[4] = 1; // 32-bit
  bytes[5] = 1; // little-endian
  view.setUint32(32, shoff, true);
  view.setUint16(46, shentsize, true);
  view.setUint16(48, allSections.length, true);
  view.setUint16(50, allSections.length - 1, true); // .shstrtab index

  for (let i = 0; i < allSections.length; i++) {
    const sec = allSections[i];
    bytes.set(sec.data, sectionOffsets[i]);
    const base = shoff + i * Math.max(shentsize, 40);
    view.setUint32(base + 0, nameOffsets.get(sec.name) ?? 0, true);
    view.setUint32(base + 4, sec.type, true);
    const shOffset =
      i === 1 && overrides?.corruptSectionOffset !== undefined
        ? overrides.corruptSectionOffset
        : sectionOffsets[i];
    view.setUint32(base + 16, shOffset, true);
    view.setUint32(base + 20, sec.data.length, true);
    view.setUint32(base + 24, sec.link ?? 0, true);
    view.setUint32(base + 36, sec.entsize ?? 0, true);
  }

  return buf;
}

function buildSymtabAndStrtab(
  entries: Array<{ name: string; value: number; size: number; type?: number }>,
): { symtab: Uint8Array; strtab: Uint8Array } {
  const strBytes: number[] = [0];
  const nameOffsets: number[] = [];
  for (const e of entries) {
    nameOffsets.push(strBytes.length);
    for (const b of textEncoder.encode(e.name)) strBytes.push(b);
    strBytes.push(0);
  }
  const symBuf = new ArrayBuffer(entries.length * 16);
  const symView = new DataView(symBuf);
  entries.forEach((e, i) => {
    const base = i * 16;
    symView.setUint32(base + 0, nameOffsets[i], true);
    symView.setUint32(base + 4, e.value >>> 0, true);
    symView.setUint32(base + 8, e.size >>> 0, true);
    symView.setUint8(base + 12, e.type ?? 2); // STT_FUNC = 2
    symView.setUint16(base + 14, 1, true); // non-UNDEF section
  });
  return { symtab: new Uint8Array(symBuf), strtab: new Uint8Array(strBytes) };
}

function buildDebugLineUnit(options: {
  dirs: string[];
  files: Array<{ name: string; dirIdx: number }>;
  program: number[];
}): Uint8Array {
  const headerBody: number[] = [];
  headerBody.push(2); // min_instruction_length
  headerBody.push(1); // max_ops_per_instruction (DWARF 4)
  headerBody.push(1); // default_is_stmt
  headerBody.push(0xfb); // line_base = -5 (int8)
  headerBody.push(14); // line_range = 14
  headerBody.push(13); // opcode_base = 13
  headerBody.push(0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1); // 12 std opcode lengths

  for (const dir of options.dirs) {
    for (const b of textEncoder.encode(dir)) headerBody.push(b);
    headerBody.push(0);
  }
  headerBody.push(0); // end dirs

  for (const file of options.files) {
    for (const b of textEncoder.encode(file.name)) headerBody.push(b);
    headerBody.push(0);
    headerBody.push(...encodeULEB128(file.dirIdx));
    headerBody.push(0, 0); // mtime, size
  }
  headerBody.push(0); // end files

  const unitBodyLength = 2 + 4 + headerBody.length + options.program.length;
  const out = new Uint8Array(4 + unitBodyLength);
  const view = new DataView(out.buffer);
  view.setUint32(0, unitBodyLength, true);
  view.setUint16(4, 4, true); // DWARF v4
  view.setUint32(6, headerBody.length, true);
  out.set(headerBody, 10);
  out.set(options.program, 10 + headerBody.length);
  return out;
}

function u32le(n: number): number[] {
  return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
}

describe("elfAnalysis", () => {
  it("resolves symbols, Thumb addresses, high addresses >= 0x80000000, and non-ASCII UTF-8 DWARF paths", () => {
    const { symtab, strtab } = buildSymtabAndStrtab([
      { name: "main", value: 0x00010001, size: 0x20 },
      { name: "high_fn", value: 0x80001001, size: 0x40 },
    ]);

    const program: number[] = [
      // Set address 0x00010000, line 10, copy
      0,
      5,
      2,
      ...u32le(0x00010000),
      3,
      ...encodeSLEB128(9), // line = 1 + 9 = 10
      1, // DW_LNS_copy
      // Advance pc by 8 (4 * 2), end sequence at 0x00010008
      2,
      ...encodeULEB128(4),
      0,
      1,
      1, // DW_LNE_end_sequence
      // High address sequence at 0x80001000, file 2, line 42
      0,
      5,
      2,
      ...u32le(0x80001000),
      4,
      ...encodeULEB128(2), // DW_LNS_set_file(2)
      3,
      ...encodeSLEB128(41), // line = 1 + 41 = 42
      1, // DW_LNS_copy
      2,
      ...encodeULEB128(8),
      0,
      1,
      1, // DW_LNE_end_sequence
    ];

    const debugLine = buildDebugLineUnit({
      dirs: ["src/日本語パス", "drivers/sensor"],
      files: [
        { name: "main.c", dirIdx: 1 },
        { name: "高アドレス.c", dirIdx: 2 },
      ],
      program,
    });

    const elf = parseElf(
      buildElf32([
        { name: ".strtab", type: 3, data: strtab },
        { name: ".symtab", type: 2, data: symtab, link: 1, entsize: 16 },
        { name: ".debug_line", type: 1, data: debugLine },
      ]),
      "firmware.elf",
    );

    expect(resolveAddress(elf, 0x00010005)).toEqual({
      functionName: "main",
      offset: 4,
      file: "src/日本語パス/main.c",
      line: 10,
    });

    // High address >= 0x80000000 stays unsigned and resolves both symbol & UTF-8 file
    expect(resolveAddress(elf, 0x80001005)).toEqual({
      functionName: "high_fn",
      offset: 4,
      file: "drivers/sensor/高アドレス.c",
      line: 42,
    });

    // Address past end_sequence and past sym.size must not match bogus line/symbol
    expect(resolveAddress(elf, 0x20001000)).toBeNull();
  });

  it("handles malformed extended-opcode ULEB128 lengths without looping or crashing", () => {
    const debugLine = buildDebugLineUnit({
      dirs: ["src"],
      files: [{ name: "bad.c", dirIdx: 1 }],
      program: [
        // Extended opcode with 5-byte ULEB128 length setting bit 31 (would overflow negative under signed |=)
        0,
        0xff, 0xff, 0xff, 0xff, 0x0f, 2, 0, 0, 0, 0,
      ],
    });

    const elf = parseElf(
      buildElf32([{ name: ".debug_line", type: 1, data: debugLine }]),
      "corrupt.elf",
    );
    expect(elf.lines).toEqual([]);
  });

  it("throws ElfParseError for invalid section/symbol header sizes or out-of-bounds sections", () => {
    const { symtab, strtab } = buildSymtabAndStrtab([
      { name: "fn", value: 0x100, size: 8 },
    ]);

    expect(() =>
      parseElf(buildElf32([], { e_shentsize: 16 }), "bad-shentsize.elf"),
    ).toThrow(ElfParseError);

    expect(() =>
      parseElf(
        buildElf32([
          { name: ".strtab", type: 3, data: strtab },
          { name: ".symtab", type: 2, data: symtab, link: 1, entsize: 8 },
        ]),
        "bad-entsize.elf",
      ),
    ).toThrow(ElfParseError);

    expect(() =>
      parseElf(
        buildElf32(
          [
            { name: ".strtab", type: 3, data: strtab },
            { name: ".symtab", type: 2, data: symtab, link: 1, entsize: 16 },
          ],
          { corruptSectionOffset: 0x00ffffff },
        ),
        "oob-section.elf",
      ),
    ).toThrow(ElfParseError);
  });
});
