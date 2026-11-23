export const SLOTHOUSE_LOGO_SRC = '/brand/slothouse/Slot-House-Vector.svg';
export const SLOTHOUSE_FAVICON_SRC = '/brand/slothouse/favicon-64.png';
export const SLOTHOUSE_FAVICON_ICO_SRC = '/brand/slothouse/favicon.ico';

const SLOTHOUSE_LABEL = 'slothouse';

/** True when a hostname label is slothouse (admin.slothouse.io, slothouse.cc, etc.). */
export function isSlotHouseHostname(hostname: string): boolean {
  const host = hostname.split(':')[0].toLowerCase().replace(/^www\./, '');
  return host.split('.').includes(SLOTHOUSE_LABEL);
}
