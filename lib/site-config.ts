import type { SiteConfig } from '../types'
import siteConfigJson from '../public/generated/site-config.json'

export const siteConfig: SiteConfig = siteConfigJson as unknown as SiteConfig
