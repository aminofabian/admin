import { findUnsupportedEmailVariables } from '../email-campaign-variables';

describe('findUnsupportedEmailVariables', () => {
  it('returns [] for allowed placeholders', () => {
    expect(
      findUnsupportedEmailVariables('<p>Hi {{ username }}, {{ project_name }}</p>'),
    ).toEqual([]);
  });

  it('flags unknown placeholders', () => {
    expect(
      findUnsupportedEmailVariables('<p>{{ username }} {{ foo_bar }} {{ amount }}</p>'),
    ).toEqual(['amount', 'foo_bar']);
  });
});
