import path from 'path'
import { createAuthSetup } from './setup-base'

createAuthSetup({
    emailEnvVar: 'TEST_PLANNER_EMAIL',
    passwordEnvVar: 'TEST_PLANNER_PASSWORD',
    storageFile: path.resolve(__dirname, '../../.auth/planner.json'),
})
