import React, { memo } from "react"
import { graphql } from "gatsby"

export const query = graphql`
  fragment UnknownGutenbergBlock on GutenbergBlock {
    saveContent
  }
`

export default memo(({ saveContent }) => <div dangerouslySetInnerHTML={{ __html: saveContent }} />)
