export const PROFILE_PHOTO_UPDATED_EVENT = "pontuaenem:profile-photo-updated";

export function isProfilePhotoDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}
