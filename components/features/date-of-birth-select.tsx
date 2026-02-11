'use client';

import { DateSelect } from '@/components/ui';

export function DateOfBirthSelect(
  props: React.ComponentProps<typeof DateSelect> & { label?: string }
) {
  return <DateSelect {...props} label={props.label ?? 'Date of Birth'} />;
}
