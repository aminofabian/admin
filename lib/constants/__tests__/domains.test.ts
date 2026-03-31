import {
  isPermittedSuperadminDomain,
  PERMITTED_SUPERADMIN_DOMAINS,
} from '../domains';

describe('isPermittedSuperadminDomain', () => {
  it('should allow production and beta superadmin serverhub hosts', () => {
    expect(isPermittedSuperadminDomain('sa.serverhub.biz')).toBe(true);
    expect(isPermittedSuperadminDomain('sa-beta.serverhub.biz')).toBe(true);
  });

  it('should allow Vercel beta admin host', () => {
    expect(isPermittedSuperadminDomain('beta-omega-tan.vercel.app')).toBe(true);
  });

  it('should reject unknown hosts', () => {
    expect(isPermittedSuperadminDomain('evil.example.com')).toBe(false);
  });

  it('should list every permitted hostname explicitly', () => {
    for (const host of PERMITTED_SUPERADMIN_DOMAINS) {
      if (host === 'localhost' || host === '127.0.0.1') continue;
      expect(isPermittedSuperadminDomain(host)).toBe(true);
    }
  });
});
