import { config } from 'dotenv'
import populateEnv from 'populate-env'

config()

export let env = {
  PAGE_SLUG: '',
}

populateEnv(env, { mode: 'halt' })
