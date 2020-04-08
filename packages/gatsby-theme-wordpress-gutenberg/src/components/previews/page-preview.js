import React from "react"
import Status, { useIsUpToDate } from "./status"

const PagePreview = ({ changedTime, modifiedTime, blocks, Blocks, PageTemplate, ...rest }) => {
  const isUpToDate = useIsUpToDate({ changedTime, modifiedTime })

  return (
    <>
      <Status isUpToDate={isUpToDate} />
      <PageTemplate {...rest}>
        <Blocks blocks={blocks}></Blocks>
      </PageTemplate>
    </>
  )
}

export default PagePreview
