import {
  findMissingRequiredEmailVariables,
  findUnsupportedEmailVariables,
} from '../email-campaign-variables';

describe('findUnsupportedEmailVariables', () => {
  it('returns [] for allowed placeholders', () => {
    expect(
      findUnsupportedEmailVariables(
        '<p>Hi {{ username }}, you have {{ spins_left }} spins left. {{ unsubscribe_url }}</p>',
      ),
    ).toEqual([]);
  });

  it('flags unknown placeholders', () => {
    expect(
      findUnsupportedEmailVariables('<p>{{ username }} {{ foo_bar }} {{ amount }}</p>'),
    ).toEqual(['amount', 'foo_bar']);
  });
});

describe('findMissingRequiredEmailVariables', () => {
  it('flags missing unsubscribe_url', () => {
    expect(findMissingRequiredEmailVariables('<p>Hi {{ username }}</p>')).toEqual([
      'unsubscribe_url',
    ]);
  });

  it('returns [] when unsubscribe_url is present', () => {
    expect(
      findMissingRequiredEmailVariables(
        '<p>Hi {{ username }}</p><a href="{{ unsubscribe_url }}">Unsubscribe</a>',
      ),
    ).toEqual([]);
  });
});
