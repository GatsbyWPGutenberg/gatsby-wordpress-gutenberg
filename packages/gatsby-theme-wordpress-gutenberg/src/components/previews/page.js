import React from "react"
import BlockPreview, { useBlockPreview } from "./block-preview"
import PagePreview from "./page-preview"

const Page = props => {
  const { data, pageContext } = props

  const modifiedTime = data && new Date(data.gutenbergContent.modifiedTime)
  const blocks = (data && data.gutenbergContent.blocks) || []

  const { isBlockPreview, changedTime, clientId } = useBlockPreview()

  if (isBlockPreview) {
    return (
      <BlockPreview
        {...props}
        blocks={blocks}
        clientId={clientId}
        modifiedTime={modifiedTime}
        changedTime={changedTime}
      />
    )
  }

  return (
    <PagePreview
      {...props}
      blocks={blocks}
      changedTime={pageContext.changedTime && new Date(pageContext.changedTime)}
      modifiedTime={modifiedTime}
    />
  )
}

export default Page
