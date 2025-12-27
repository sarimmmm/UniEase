// Validate university email pattern: @mtn.nu.edu.pk
export function validateUniversityEmail(email: string): boolean {
  const pattern = /^[^\s@]+@mtn\.nu\.edu\.pk$/i;
  return pattern.test(email);
}

