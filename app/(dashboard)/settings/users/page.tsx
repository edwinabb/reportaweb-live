import { getDocumentTypes } from '@/lib/actions/document-types'
import { getJobTitles } from '@/lib/actions/job-titles'
import { UsersSettingsClient } from './client-page'

export default async function UsersSettingsPage() {
    const [docsResponse, jobsResponse] = await Promise.all([
        getDocumentTypes(),
        getJobTitles(false)
    ])

    const documentTypes = docsResponse.data || []
    const jobTitles = jobsResponse.data || []

    return (
        <div className="h-full p-8 hidden md:block">
            <UsersSettingsClient documentTypes={documentTypes} jobTitles={jobTitles} />
        </div>
    )
}
