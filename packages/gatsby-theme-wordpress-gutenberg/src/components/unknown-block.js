import React, { memo } from "react"
import { graphql } from "gatsby"

export const query = graphql`
  fragment ThemeWordpressGutenbergUnknownBlock on WpBlock {
    saveContent
  }
`

export default memo(({ saveContent }) => <div dangerouslySetInnerHTML={{ __html: saveContent }} />)
