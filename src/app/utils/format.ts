export function formatOneTimeLink(
  location: Location,
  oneTimeLink: { oneTimeLink: string }
) {
  return `${location.protocol}//${location.host}/cnf/${oneTimeLink.oneTimeLink}`;
}
