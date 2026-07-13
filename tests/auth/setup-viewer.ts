import path from 'path'
import { createAuthSetup } from './setup-base'

createAuthSetup({
    emailEnvVar: 'TEST_VIEWER_EMAIL',
    passwordEnvVar: 'TEST_VIEWER_PASSWORD',
    storageFile: path.resolve(__dirname, '../../.auth/viewer.json'),
})
