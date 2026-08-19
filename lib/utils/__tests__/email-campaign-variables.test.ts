import {
  findMissingRequiredEmailVariables,
  findUnsupportedCampaignVariables,
  findUnsupportedEmailVariables,
  isUnsupportedVariablesError,
  unsupportedVariablesErrorMessage,
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

  it('uses API allowed_variables when provided', () => {
    expect(findUnsupportedEmailVariables('{{ username }} {{ amount }}', ['username', 'amount'])).toEqual(
      [],
    );
    expect(findUnsupportedEmailVariables('{{ spins_left }}', ['username'])).toEqual(['spins_left']);
  });
});

describe('findUnsupportedCampaignVariables', () => {
  it('checks subject and body', () => {
    expect(
      findUnsupportedCampaignVariables('Hello {{ amount }}', '<p>{{ username }}</p>'),
    ).toEqual(['amount']);
  });
});

describe('unsupported_variables errors', () => {
  it('detects API code and lists keys', () => {
    const error = {
      code: 'unsupported_variables',
      unsupported_variables: ['foo', 'amount'],
    };
    expect(isUnsupportedVariablesError(error)).toBe(true);
    expect(unsupportedVariablesErrorMessage(error, 'fallback')).toBe(
      'Unsupported variables: {{ foo }}, {{ amount }}.',
    );
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
