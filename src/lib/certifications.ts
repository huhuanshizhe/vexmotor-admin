export type CertificationRecord = {
  slug: string;
  code: string;
  title: string;
  applicableLines: string[];
  issuer: string;
  summary: string;
  downloadFileName: string;
};

export const certificationRecords: CertificationRecord[] = [
  {
    slug: 'ce',
    code: 'CE',
    title: 'CE Declaration Summary',
    applicableLines: ['Stepper motors', 'Drivers', 'Linear actuators'],
    issuer: 'StepMotech compliance desk with third-party file on request',
    summary: 'Reference declaration summary for EU market review, product documentation packs, and pre-release buyer qualification.',
    downloadFileName: 'stepmotech-ce-reference.pdf',
  },
  {
    slug: 'ul',
    code: 'UL',
    title: 'UL Readiness Summary',
    applicableLines: ['Driver assemblies', 'Power interfaces', 'Control accessories'],
    issuer: 'StepMotech technical documentation team',
    summary: 'Documentation route for buyers who need component-safety review and integration planning before program release.',
    downloadFileName: 'stepmotech-ul-reference.pdf',
  },
  {
    slug: 'rohs',
    code: 'RoHS',
    title: 'RoHS Material Compliance Summary',
    applicableLines: ['Motors', 'Drivers', 'Power supplies', 'Accessories'],
    issuer: 'Factory materials and supplier declaration file',
    summary: 'Substance-restriction summary for standard catalog hardware and buyer-side environmental review.',
    downloadFileName: 'stepmotech-rohs-reference.pdf',
  },
  {
    slug: 'reach',
    code: 'REACH',
    title: 'REACH Declaration Summary',
    applicableLines: ['Motion components', 'Cable sets', 'Electromechanical accessories'],
    issuer: 'Supplier declaration route with compliance consolidation',
    summary: 'Reference statement for substance reporting and EU market-entry documentation workflows.',
    downloadFileName: 'stepmotech-reach-reference.pdf',
  },
  {
    slug: 'iso9001',
    code: 'ISO9001',
    title: 'ISO 9001 Quality System Summary',
    applicableLines: ['Factory quality systems', 'Catalog production', 'OEM support'],
    issuer: 'Quality management documentation archive',
    summary: 'Quality-system reference for distributor qualification, supplier onboarding, and process review requests.',
    downloadFileName: 'stepmotech-iso9001-reference.pdf',
  },
  {
    slug: 'iatf16949',
    code: 'IATF 16949',
    title: 'Automotive Process Summary',
    applicableLines: ['Automotive test stands', 'Actuation subsystems', 'Program-specific builds'],
    issuer: 'Automotive documentation route on request',
    summary: 'Reference process file for automotive-adjacent programs where documentation discipline and traceability matter.',
    downloadFileName: 'stepmotech-iatf16949-reference.pdf',
  },
  {
    slug: 'ip65',
    code: 'IP65',
    title: 'Ingress Protection Summary',
    applicableLines: ['Protected assemblies', 'Harsh-environment motion', 'Washdown-adjacent builds'],
    issuer: 'Application-specific validation file',
    summary: 'Ingress-protection summary for buyers screening enclosure and environmental suitability before sample or RFQ release.',
    downloadFileName: 'stepmotech-ip65-reference.pdf',
  },
  {
    slug: 'iec60034',
    code: 'IEC 60034',
    title: 'IEC 60034 Reference Summary',
    applicableLines: ['Rotating electrical machines', 'Motor documentation', 'Performance review'],
    issuer: 'Engineering reference dossier',
    summary: 'Reference file for electrical-machine documentation discussions and regulated buyer review workflows.',
    downloadFileName: 'stepmotech-iec60034-reference.pdf',
  },
];

export const exportComplianceNotes = [
  'Most stocked catalog items are handled as EAR99 planning references unless a project-specific review indicates otherwise.',
  'Programs with unusual end use, controlled destinations, or defense-adjacent integration should be reviewed manually before shipment release.',
  'ECCN classification and destination-specific restrictions remain part of the commercial and logistics review when a buyer requests export documentation.',
] as const;

export const restrictedCountryNotes = [
  'Shipments into sanctioned or embargoed destinations require manual review and may be refused before order release.',
  'Markets with stricter import readiness such as India, Turkiye, Brazil, and South Africa should confirm importer capability before booking the lane.',
  'The compliance desk may request end-user, end-use, or forwarder details before releasing a documentation pack for sensitive destinations.',
] as const;

export function getCertificationRecord(slug: string) {
  return certificationRecords.find((record) => record.slug === slug) ?? null;
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildSimplePdf(lines: string[]) {
  const contentLines = lines.map((line, index) => `${index === 0 ? '72 760 Td' : 'T*'} (${escapePdfText(line)}) Tj`).join('\n');
  const contentStream = `BT\n/F1 12 Tf\n${contentLines}\nET`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj`,
  ];

  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(body.length);
    body += `${object}\n`;
  }
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    body += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(body);
}

function crc32(input: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

type ZipFile = {
  name: string;
  content: string;
};

export function buildZipArchive(files: ZipFile[]) {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const checksum = crc32(contentBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, contentBytes.length, true);
    localView.setUint32(22, contentBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, contentBytes.length, true);
    centralView.setUint32(24, contentBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    localChunks.push(localHeader, contentBytes);
    centralChunks.push(centralHeader);
    offset += localHeader.length + contentBytes.length;
  }

  const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const endHeader = new Uint8Array(22);
  const endView = new DataView(endHeader.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  const archive = new Uint8Array(offset + centralSize + endHeader.length);
  let pointer = 0;
  for (const chunk of [...localChunks, ...centralChunks, endHeader]) {
    archive.set(chunk, pointer);
    pointer += chunk.length;
  }

  return archive;
}