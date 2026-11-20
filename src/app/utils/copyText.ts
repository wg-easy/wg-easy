/**
 * Copies text to the clipboard, also when wg-easy is opened over plain HTTP
 * (`INSECURE=true`). Browsers only expose `navigator.clipboard` in secure
 * contexts, so this falls back to selecting a hidden textarea and running
 * `document.execCommand('copy')`.
 *
 * Call it from a click handler: the fallback needs the user's gesture.
 * Returns whether the text was copied.
 */
export async function copyText(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall back below
    }
  }

  // Dialogs trap focus, so a textarea outside an open dialog could not be
  // selected. Put it inside the dialog when there is one.
  const host = document.querySelector('[role="dialog"]') ?? document.body;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  host.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let copied: boolean;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
}
