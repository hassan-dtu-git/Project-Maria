// Social interaction requires an authenticated account and a trusted verification result.
// Do not infer adult eligibility from editable user metadata or self-attestation.
export function canUseAdultSocialFeatures(user, verificationChecked, adultVerified) {
  return Boolean(user && verificationChecked === true && adultVerified === true);
}
