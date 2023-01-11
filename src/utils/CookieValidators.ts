export class CookieValidators {
  public static validateSessionContext(
    sessionContext: string,
    routingNumber: string,
    themeNumber: number
  ): void {
    if (sessionContext.length === 0)
      throw new Error('session context cookie value is empty string');
    if (/^[0-9]{9}_[0-9]+$/g.test(sessionContext) !== true)
      throw new Error('session context cookie failed regex test');
    const parts = sessionContext.split('_');
    if (parts[0] !== routingNumber)
      throw new Error('session context cookie has mismatched routing number');
    if (parts[1] !== themeNumber.toString())
      throw new Error('session context cookie has mismatched theme number');
  }

  public static validatePBISession(pbiSession: string) {
    // "CfDJ8" is the base64 representation of the magic "09 F0 C9 F0"
    // header that identifies a payload protected by the ASP.NET data protection system.
    // See: https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/compatibility/replacing-machinekey
    // See: https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/introduction?view=aspnetcore-7.0
    const uriDecoded = decodeURIComponent(pbiSession);
    if (uriDecoded.startsWith('CfDJ8') !== true)
      throw new Error('pbi session cookie missing expected magic bytes');
  }

  public static validatePMData(pmData: string) {
    // The value that comes back is doubly-url-encoded base64 with the prefix "PMV6Nt".
    // The base64 strings seem to always be a fixed length (after URL decoding)
    // of 94 chars, including a "==" suffix.
    // "==" encodes to "%3D%3D" encodes to "%253D%253D".
    // Thus checking that that suffix exits feels like a decent test
    if (!pmData.endsWith('%253D%253D'))
      throw new Error("pmdata cookie doesn't match expected format");
  }

  public static validateTS(ts: string) {
    // The TS01d4e29a cookie seems to come from an F5 load balancer.
    // See: https://stackoverflow.com/questions/52330611/anyone-know-what-a-ts-cookie-is-and-what-kind-of-data-its-for
    // Observation shows these to be lowercase hex strings
    if (/^[0-9a-f]+$/g.test(ts) !== true)
      throw new Error("ts cookie doesn't match expected regex");
  }
}
