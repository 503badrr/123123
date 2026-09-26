export const PASSWORD_MIN_LENGTH = 12;

export function getPasswordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `كلمة المرور يجب أن تكون ${PASSWORD_MIN_LENGTH} حرفًا على الأقل`;
  }
  if (!/[a-z]/.test(password)) {
    return "كلمة المرور يجب أن تحتوي على حرف إنجليزي صغير واحد على الأقل";
  }
  if (!/[A-Z]/.test(password)) {
    return "كلمة المرور يجب أن تحتوي على حرف إنجليزي كبير واحد على الأقل";
  }
  if (!/[0-9]/.test(password)) {
    return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل";
  }
  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return "كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل";
  }
  return null;
}
