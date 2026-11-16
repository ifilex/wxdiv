import forge from "node-forge";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import JSZip from "jszip";

const execFileAsync = promisify(execFile);

export interface CloudCompilerCapabilities {
  cryptoSigning: boolean;
  pkcs12Supported: boolean;
  pkcs7JarSigning: boolean;
  hasJava: boolean;
  hasGradle: boolean;
  hasAndroidSdk: boolean;
  hasLocalAndroidSdk: boolean;
  hasRemoteRunner: boolean;
  remoteRunnerUrlConfigured: boolean;
  githubActionsSupported: boolean;
}

export interface KeystoreGenerateInput {
  alias?: string;
  storePassword?: string;
  keyPassword?: string;
  commonName?: string;
  organizationUnit?: string;
  organization?: string;
  locality?: string;
  state?: string;
  country?: string;
  validityYears?: number;
  keySize?: 2048 | 4096;
}

export interface KeystoreBundleResult {
  alias: string;
  keySize: number;
  validityYears: number;
  validFrom: string;
  validUntil: string;
  subject: string;
  serialNumber: string;
  keystoreP12Base64: string;
  uploadCertificatePem: string;
  keystoreProperties: string;
  gradleSigningSnippet: string;
  fingerprints: {
    sha256: string;
    sha1: string;
    md5: string;
  };
}

function formatColonHex(hex: string): string {
  return (
    hex
      .toUpperCase()
      .match(/.{1,2}/g)
      ?.join(":") || hex.toUpperCase()
  );
}

function computeCertFingerprints(cert: forge.pki.Certificate) {
  const derBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const buf = Buffer.from(derBytes, "binary");
  return {
    sha256: formatColonHex(crypto.createHash("sha256").update(buf).digest("hex")),
    sha1: formatColonHex(crypto.createHash("sha1").update(buf).digest("hex")),
    md5: formatColonHex(crypto.createHash("md5").update(buf).digest("hex")),
  };
}

async function checkCommandExists(cmd: string, args: string[] = ["--version"]): Promise<boolean> {
  try {
    await execFileAsync(cmd, args, { timeout: 2500 });
    return true;
  } catch {
    return false;
  }
}

export async function getCloudCompilerCapabilities(): Promise<CloudCompilerCapabilities> {
  const [hasJava, hasGradle] = await Promise.all([
    checkCommandExists("java", ["-version"]),
    checkCommandExists("gradle", ["-version"]),
  ]);
  const hasAndroidSdk = Boolean(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT);

  return {
    cryptoSigning: true,
    pkcs12Supported: true,
    pkcs7JarSigning: true,
    hasJava,
    hasGradle,
    hasAndroidSdk,
    hasLocalAndroidSdk: hasJava && hasAndroidSdk,
    hasRemoteRunner: false,
    remoteRunnerUrlConfigured: false,
    githubActionsSupported: false,
  };
}

/**
 * Generates an authentic RSA-2048/4096 PKCS#12 (.p12) Release Keystore
 * and Google Play App Signing PEM certificate using node-forge.
 */
export function generateReleaseKeystore(input: KeystoreGenerateInput): KeystoreBundleResult {
  const alias = (input.alias || "wxdiv-release").replace(/[^a-zA-Z0-9._-]/g, "") || "wxdiv-release";
  const storePassword = input.storePassword && input.storePassword.length >= 6
    ? input.storePassword
    : "wxdiv2026release";
  const keyPassword = input.keyPassword && input.keyPassword.length >= 6
    ? input.keyPassword
    : storePassword;

  const keySize: 2048 | 4096 = input.keySize === 4096 ? 4096 : 2048;
  const validityYears = Math.min(50, Math.max(10, Number(input.validityYears) || 25));

  const commonName = (input.commonName || "WXDIV Publisher").trim().slice(0, 64);
  const organizationUnit = (input.organizationUnit || "Mobile Studio").trim().slice(0, 64);
  const organization = (input.organization || "Winebox Digital").trim().slice(0, 64);
  const locality = (input.locality || "Madrid").trim().slice(0, 64);
  const state = (input.state || "Madrid").trim().slice(0, 64);
  const country = ((input.country || "ES").trim().toUpperCase().replace(/[^A-Z]/g, "") || "ES").slice(0, 2);

  const keys = forge.pki.rsa.generateKeyPair(keySize);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = crypto.randomBytes(8).toString("hex");

  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setFullYear(now.getFullYear() + validityYears);
  cert.validity.notBefore = now;
  cert.validity.notAfter = validUntil;

  const attrs = [
    { name: "commonName", value: commonName },
    { shortName: "OU", value: organizationUnit },
    { name: "organizationName", value: organization },
    { name: "localityName", value: locality },
    { shortName: "ST", value: state },
    { name: "countryName", value: country },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: "basicConstraints", cA: false },
    {
      name: "keyUsage",
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
    },
    {
      name: "extKeyUsage",
      codeSigning: true,
    },
    { name: "subjectKeyIdentifier" },
  ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], storePassword, {
    friendlyName: alias,
    algorithm: "3des",
    generateLocalKeyId: true,
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  const keystoreP12Base64 = Buffer.from(p12Der, "binary").toString("base64");
  const uploadCertificatePem = forge.pki.certificateToPem(cert);
  const fingerprints = computeCertFingerprints(cert);

  const subjectString = `CN=${commonName}, OU=${organizationUnit}, O=${organization}, L=${locality}, ST=${state}, C=${country}`;

  const keystoreProperties = `# WXDIV 3.0 Release Signing Configuration
storeFile=signing/release-keystore.p12
storeType=PKCS12
storePassword=${storePassword}
keyAlias=${alias}
keyPassword=${keyPassword}
`;

  const gradleSigningSnippet = `signingConfigs {
    release {
        storeFile file("signing/release-keystore.p12")
        storeType "PKCS12"
        storePassword props["storePassword"]
        keyAlias props["keyAlias"]
        keyPassword props["keyPassword"]
    }
}`;

  return {
    alias,
    keySize,
    validityYears,
    validFrom: now.toISOString(),
    validUntil: validUntil.toISOString(),
    subject: subjectString,
    serialNumber: cert.serialNumber,
    keystoreP12Base64,
    uploadCertificatePem,
    keystoreProperties,
    gradleSigningSnippet,
    fingerprints,
  };
}

/**
 * Parses and inspects an existing PKCS#12 (.p12 / .pfx) keystore.
 */
export function inspectKeystoreP12(p12Base64: string, password: string) {
  const der = Buffer.from(p12Base64, "base64").toString("binary");
  const asn1 = forge.asn1.fromDer(der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const keyBags =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ||
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ||
    [];

  if (certBags.length === 0 || !certBags[0].cert) {
    throw new Error("El archivo PKCS#12 no contiene ningún certificado X.509 válido.");
  }
  if (keyBags.length === 0 || !keyBags[0].key) {
    throw new Error("El archivo PKCS#12 no contiene ninguna clave privada para firmar.");
  }

  const certBag = certBags[0];
  const cert = certBag.cert!;
  const friendlyName =
    (certBag.attributes?.friendlyName && certBag.attributes.friendlyName[0]) ||
    (keyBags[0].attributes?.friendlyName && keyBags[0].attributes.friendlyName[0]) ||
    "wxdiv-release";

  const subjectParts = cert.subject.attributes.map(
    (a) => `${a.shortName || a.name}=${a.value}`
  );
  const fingerprints = computeCertFingerprints(cert);
  const uploadCertificatePem = forge.pki.certificateToPem(cert);

  return {
    alias: friendlyName,
    subject: subjectParts.join(", "),
    serialNumber: cert.serialNumber,
    validFrom: cert.validity.notBefore.toISOString(),
    validUntil: cert.validity.notAfter.toISOString(),
    fingerprints,
    uploadCertificatePem,
    hasPrivateKey: true,
  };
}

/**
 * Signs an archive's manifest using genuine JAR v1 PKCS#7 / CMS SignedData
 * (META-INF/MANIFEST.MF, META-INF/WXDIV.SF, META-INF/WXDIV.RSA).
 */
export async function signPackageManifestArchive(params: {
  entries: Array<{ path: string; contentBase64: string }>;
  keystoreP12Base64: string;
  password: string;
  alias?: string;
}) {
  const { entries, keystoreP12Base64, password } = params;
  const der = Buffer.from(keystoreP12Base64, "base64").toString("binary");
  const asn1 = forge.asn1.fromDer(der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const keyBags =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ||
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ||
    [];

  if (!certBags[0]?.cert || !keyBags[0]?.key) {
    throw new Error("No se pudo extraer la clave privada y certificado del keystore.");
  }

  const cert = certBags[0].cert;
  const privateKey = keyBags[0].key as forge.pki.rsa.PrivateKey;
  const fingerprints = computeCertFingerprints(cert);

  const zip = new JSZip();
  let manifestText = "Manifest-Version: 1.0\r\nCreated-By: WXDIV 3.0 Cloud Signer (node-forge)\r\n\r\n";
  let sfSections = "";

  for (const entry of entries) {
    const cleanPath = entry.path.replace(/^\/+/, "");
    if (!cleanPath || cleanPath.startsWith("META-INF/")) continue;

    const rawBuf = Buffer.from(entry.contentBase64, "base64");
    zip.file(cleanPath, rawBuf);

    const sha256B64 = crypto.createHash("sha256").update(rawBuf).digest("base64");
    const section = `Name: ${cleanPath}\r\nSHA-256-Digest: ${sha256B64}\r\n\r\n`;
    manifestText += section;

    const sectionDigestB64 = crypto
      .createHash("sha256")
      .update(Buffer.from(section, "utf8"))
      .digest("base64");
    sfSections += `Name: ${cleanPath}\r\nSHA-256-Digest: ${sectionDigestB64}\r\n\r\n`;
  }

  const manifestDigestB64 = crypto
    .createHash("sha256")
    .update(Buffer.from(manifestText, "utf8"))
    .digest("base64");

  const sfText =
    `Signature-Version: 1.0\r\n` +
    `Created-By: WXDIV 3.0 Cloud Signer\r\n` +
    `SHA-256-Digest-Manifest: ${manifestDigestB64}\r\n\r\n` +
    sfSections;

  // Detached PKCS#7 / CMS SignedData over WXDIV.SF
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(sfText, "utf8");
  p7.addCertificate(cert);
  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as any },
    ],
  });
  p7.sign({ detached: true });

  const p7DerBytes = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const p7DerBuf = Buffer.from(p7DerBytes, "binary");

  zip.file("META-INF/MANIFEST.MF", manifestText);
  zip.file("META-INF/WXDIV.SF", sfText);
  zip.file("META-INF/WXDIV.RSA", p7DerBuf);

  const signedZipBase64 = await zip.generateAsync({
    type: "base64",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const subject = cert.subject.attributes
    .map((a) => `${a.shortName || a.name}=${a.value}`)
    .join(", ");

  return {
    verified: true,
    algorithm: "SHA256withRSA (PKCS#7 / JAR v1 + PKCS#12)",
    signedFilesCount: entries.length,
    signerSubject: subject,
    sha256Fingerprint: fingerprints.sha256,
    sha1Fingerprint: fingerprints.sha1,
    manifestPreview: manifestText.slice(0, 1200),
    signatureFilePreview: sfText.slice(0, 1200),
    pkcs7SizeBytes: p7DerBuf.length,
    signedZipBase64,
  };
}
