import api from '../services/api';

/**
 * Shared duplicate-check used by Students/Teachers/Users/Staff forms to flag an
 * already-taken email address or mobile number live, on field blur, before the
 * form is submitted. Backed by GET /api/users/check-duplicate, which looks across
 * the User, Student and Teacher tables.
 *
 * Deliberately NOT used for Parent/Guardian phone number fields — one parent can
 * legitimately share the same mobile number across multiple children's records,
 * so that field is exempt from the phone-duplication rule by design.
 */
export type DuplicateCheckField = 'email' | 'phone' | 'username';

export async function isDuplicateValue(field: DuplicateCheckField, value: string): Promise<boolean> {
  const trimmed = value?.trim();
  if (!trimmed) return false;

  try {
    const response = await api.get('/users/check-duplicate', { params: { field, value: trimmed } });
    return !!response.data?.exists;
  } catch {
    // Fail-open: a transient network/API error on a blur check should never block
    // the user from continuing to fill out the form. Submission-time validation
    // (server-side) still has the final say.
    return false;
  }
}

export const DUPLICATE_MESSAGES = {
  email: 'This email address is already registered.',
  phone: 'This mobile number is already registered.',
  username: 'This username is already taken.',
};
