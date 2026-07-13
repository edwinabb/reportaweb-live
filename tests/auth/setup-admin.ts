import path from 'path'
import { createAuthSetup } from './setup-base'

createAuthSetup({
    emailEnvVar: 'TEST_ADMIN_EMAIL',
    passwordEnvVar: 'TEST_ADMIN_PASSWORD',
    storageFile: path.resolve(__dirname, '../../.auth/admin.json'),
})
