/** Map transport wording at the presentation boundary; retain the raw error for diagnostics. */
export function connectionErrorMessage(error: string): string {
  if (
    /failed to (?:open (?:the )?(?:serial port|webusb device)|claim the CDC interface)|port.*already open|device.*in use/i.test(
      error,
    )
  ) {
    return "Could not open the keyboard connection. Another DYA Studio tab or app may be using it. Disconnect or close that tab or app, then try again. If it still fails, check the device permissions and reconnect the USB cable.";
  }
  if (/connection timed out/i.test(error)) {
    return "The keyboard did not respond in time. Check the connection and that ZMK Studio is enabled on the keyboard, then try again.";
  }
  return "Could not connect to the keyboard. Check the connection and browser permissions, then try again. See error details for more information.";
}
