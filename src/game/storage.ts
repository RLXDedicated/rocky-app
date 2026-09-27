import { getAgentEmail } from '../services/identityService'

/** Namespaces a localStorage key by the agent on this browser, so two agents sharing a PC never mix Rocky's closet or care data. */
export function scopedKey(key: string): string {
  const email = getAgentEmail()
  return email ? `${key}:${email}` : key
}
