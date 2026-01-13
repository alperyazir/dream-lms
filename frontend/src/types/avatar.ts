/**
 * Avatar Types
 * Story 9.1: Profile Avatar System
 */

export type AvatarType = "custom" | "predefined"

export interface PredefinedAvatar {
  id: string
  name: string
  url: string
}

export interface PredefinedAvatarsResponse {
  avatars: PredefinedAvatar[]
}

export interface SelectAvatarRequest {
  avatar_id: string
}

export interface SetAvatarUrlRequest {
  avatar_url: string
}

export interface AvatarUpdateResponse {
  message: string
  avatar_url: string | null
  avatar_type: AvatarType | null
}
