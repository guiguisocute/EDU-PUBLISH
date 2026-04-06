import type { WidgetsConfig } from '../types'
import widgetsConfigJson from '../public/generated/widgets-config.json'

export const widgetsConfig: WidgetsConfig = widgetsConfigJson as unknown as WidgetsConfig
