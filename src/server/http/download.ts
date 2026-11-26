/**
 * Builds an attachment `Content-Disposition` header value.
 *
 * `filename` must be ASCII. When `unicodeFilename` is given it is added as an
 * RFC 6266 / RFC 8187 `filename*` parameter, which browsers prefer over
 * `filename`.
 */
export function attachmentDisposition(
  filename: string,
  unicodeFilename?: string
) {
  const header = `attachment; filename="${filename}"`;
  if (!unicodeFilename) {
    return header;
  }
  const encoded = encodeURIComponent(unicodeFilename).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `${header}; filename*=UTF-8''${encoded}`;
}
