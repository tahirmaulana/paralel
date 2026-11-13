import {
  DomainError,
} from "@paralel/domain";

export interface KycSubmissionInput {
  fullName: string;
  nik: string;
  address: string;
  ktpPhoto: string;
}

export type ExistingKycStatus =
  | "UNVERIFIED"
  | "VERIFIED"
  | null;

export interface KycSubmissionDecision {
  kind:
    | "INITIAL"
    | "RESUBMISSION";
  resultingStatus:
    "UNVERIFIED";
}

const MAX_KTP_BYTES =
  500 * 1024;

const invalidInput = (
  message: string,
  field?: string,
): never => {
  throw new DomainError(
    "INVALID_INPUT",
    message,
    field
      ? {
          details: {
            field,
          },
        }
      : undefined,
  );
};

const normalizeRequiredString = (
  value: unknown,
  field: string,
  minimumLength: number,
  maximumLength: number,
): string => {
  if (typeof value !== "string") {
    return invalidInput(
      `${field} must be a string.`,
      field,
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length <
      minimumLength ||
    normalized.length >
      maximumLength
  ) {
    return invalidInput(
      `${field} must contain between ${minimumLength} and ${maximumLength} characters.`,
      field,
    );
  }

  return normalized;
};

const decodeBase64 = (
  encoded: string,
): Uint8Array => {
  let decoded: string;

  try {
    decoded = atob(encoded);
  } catch {
    return invalidInput(
      "ktpPhoto base64 content is invalid.",
      "ktpPhoto",
    );
  }

  const bytes =
    new Uint8Array(decoded.length);

  for (
    let index = 0;
    index < decoded.length;
    index += 1
  ) {
    bytes[index] =
      decoded.charCodeAt(index);
  }

  return bytes;
};

const hasJpegSignature = (
  value: Uint8Array,
): boolean =>
  value.length >= 3 &&
  value[0] === 0xff &&
  value[1] === 0xd8 &&
  value[2] === 0xff;

const hasPngSignature = (
  value: Uint8Array,
): boolean => {
  const signature = [
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
  ];

  return (
    value.length >=
      signature.length &&
    signature.every(
      (byte, index) =>
        value[index] === byte,
    )
  );
};

const ascii = (
  value: Uint8Array,
  start: number,
  end: number,
): string =>
  String.fromCharCode(
    ...value.slice(start, end),
  );

const hasWebpSignature = (
  value: Uint8Array,
): boolean =>
  value.length >= 12 &&
  ascii(value, 0, 4) === "RIFF" &&
  ascii(value, 8, 12) === "WEBP";

const validateKtpPhoto = (
  value: unknown,
): string => {
  if (typeof value !== "string") {
    return invalidInput(
      "ktpPhoto must be a data URL.",
      "ktpPhoto",
    );
  }

  const match =
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/
      .exec(value);

  if (!match) {
    return invalidInput(
      "ktpPhoto must be a JPEG, PNG, or WebP base64 data URL.",
      "ktpPhoto",
    );
  }

  const mediaType =
    match[1];
  const encoded =
    match[2];

  if (!encoded) {
    return invalidInput(
      "ktpPhoto cannot be empty.",
      "ktpPhoto",
    );
  }

  const decoded =
    decodeBase64(encoded);

  if (decoded.length === 0) {
    return invalidInput(
      "ktpPhoto cannot be empty.",
      "ktpPhoto",
    );
  }

  if (
    decoded.length >
      MAX_KTP_BYTES
  ) {
    return invalidInput(
      "ktpPhoto must not exceed 500 KB.",
      "ktpPhoto",
    );
  }

  const signatureValid =
    mediaType === "jpeg"
      ? hasJpegSignature(decoded)
      : mediaType === "png"
        ? hasPngSignature(decoded)
        : hasWebpSignature(decoded);

  if (!signatureValid) {
    return invalidInput(
      "ktpPhoto content does not match its declared image type.",
      "ktpPhoto",
    );
  }

  return value;
};

export const parseKycSubmission = (
  value: unknown,
): KycSubmissionInput => {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return invalidInput(
      "Request body must be a JSON object.",
    );
  }

  const body =
    value as Record<
      string,
      unknown
    >;

  const allowedFields =
    new Set([
      "fullName",
      "nik",
      "address",
      "ktpPhoto",
    ]);

  const unknownFields =
    Object.keys(body).filter(
      (field) =>
        !allowedFields.has(field),
    );

  if (
    unknownFields.length !== 0
  ) {
    throw new DomainError(
      "INVALID_INPUT",
      "Request body contains unknown fields.",
      {
        details: {
          fields: unknownFields,
        },
      },
    );
  }

  const fullName =
    normalizeRequiredString(
      body.fullName,
      "fullName",
      2,
      120,
    );

  const nik =
    normalizeRequiredString(
      body.nik,
      "nik",
      16,
      16,
    );

  if (!/^[0-9]{16}$/.test(nik)) {
    return invalidInput(
      "nik must contain exactly 16 digits.",
      "nik",
    );
  }

  const address =
    normalizeRequiredString(
      body.address,
      "address",
      5,
      500,
    );

  const ktpPhoto =
    validateKtpPhoto(
      body.ktpPhoto,
    );

  return Object.freeze({
    fullName,
    nik,
    address,
    ktpPhoto,
  });
};

export const decideKycSubmission = (
  existingStatus:
    ExistingKycStatus,
): KycSubmissionDecision => {
  if (existingStatus === null) {
    return Object.freeze({
      kind: "INITIAL",
      resultingStatus:
        "UNVERIFIED",
    });
  }

  if (
    existingStatus ===
      "UNVERIFIED"
  ) {
    return Object.freeze({
      kind: "RESUBMISSION",
      resultingStatus:
        "UNVERIFIED",
    });
  }

  if (
    existingStatus ===
      "VERIFIED"
  ) {
    throw new DomainError(
      "ALREADY_PROCESSED",
      "KYC is already verified and cannot be resubmitted.",
    );
  }

  const unreachable: never =
    existingStatus;

  throw new Error(
    `Unsupported KYC status: ${unreachable}`,
  );
};
