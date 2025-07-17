export const convertCurrencyToHex = (currency: string): string => {
  // For 3-character ASCII currencies, pad with zeros to 40 characters (20 bytes)
  if (currency.length >= 3 && currency.length <= 40 && /^[0-9A-Za-z]{3}$/.test(currency)) {
    let hex = "";
    for (let i = 0; i < currency.length; i++) {
      hex += currency.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return hex.toUpperCase().padEnd(40, "0");
  } else if (currency.length > 3 && currency.length <= 40) {
    // For non-standard currencies (e.g., 'LAWAS'), convert to hex and pad to 40 characters
    let hex = '';
    for (let i = 0; i < currency.length; i++) {
      hex += currency.charCodeAt(i).toString(16);
    }
    return hex.toUpperCase().padEnd(40, '0');
  }
  // For other cases (e.g., full hex strings if needed in future), return as is
  return currency;
};


