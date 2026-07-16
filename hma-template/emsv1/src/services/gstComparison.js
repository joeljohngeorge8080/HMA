// Pure comparison logic for the GSTR-2B vs. our-own-report reconciliation.
// Matches purely on GSTIN + Invoice Number, normalized to absorb common
// formatting differences between a government portal export and a
// manually-prepared sheet (whitespace, dashes/slashes/dots/underscores,
// case). Digits are left untouched — a GSTIN's state-code digits (e.g. a
// Delhi GSTIN starting "07") are significant, so leading zeros are never
// stripped.

const normalize = (v) =>
  String(v ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s\-/._,]/g, '')

const keyOf = (gstin, invoiceNumber) => `${normalize(gstin)}|${normalize(invoiceNumber)}`

// entries: [{ gstin, invoiceNumber, ... }] from either parser (field names
// differ slightly — gstr2b uses `gstin`, our report uses `gstNo` — so the
// caller passes an accessor pair rather than hardcoding field names here).
export const compareGstSheets = (gstr2bEntries, ownEntries) => {
  const ownByKey = new Map()
  ownEntries.forEach((e) => ownByKey.set(keyOf(e.gstNo, e.invoiceNumber), e))

  const gstr2bByKey = new Map()
  gstr2bEntries.forEach((e) => gstr2bByKey.set(keyOf(e.gstin, e.invoiceNumber), e))

  const gstr2bRows = gstr2bEntries.map((e) => ({
    ...e,
    matched: ownByKey.has(keyOf(e.gstin, e.invoiceNumber)),
  }))
  const ownRows = ownEntries.map((e) => ({
    ...e,
    matched: gstr2bByKey.has(keyOf(e.gstNo, e.invoiceNumber)),
  }))

  const matchedInGstr2b = gstr2bRows.filter((r) => r.matched).length
  const matchedInOwn = ownRows.filter((r) => r.matched).length

  return {
    gstr2bRows,
    ownRows,
    summary: {
      gstr2bCount: gstr2bRows.length,
      ownCount: ownRows.length,
      matchedCount: matchedInOwn,
      onlyInGstr2bCount: gstr2bRows.length - matchedInGstr2b,
      onlyInOwnCount: ownRows.length - matchedInOwn,
    },
  }
}
