import path from 'path'
import { createAuthSetup } from './setup-base'

createAuthSetup({
    emailEnvVar: 'TEST_REPORTA_ADMIN_EMAIL',
    passwordEnvVar: 'TEST_REPORTA_ADMIN_PASSWORD',
    storageFile: path.resolve(__dirname, '../../.auth/reporta-admin.json'),
})
