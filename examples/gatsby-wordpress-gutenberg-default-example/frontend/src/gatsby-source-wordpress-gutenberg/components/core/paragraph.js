import React from "react"
import { graphql } from "gatsby"

export const query = graphql`
  fragment CoreParagraph on WP_CoreParagraphBlock {
    __typename
    attributes {
      __typename
      ... on WP_CoreParagraphBlockAttributesV3 {
        content
      }
    }
  }
`

export default React.memo(props => {
  return (
    <code style={{ backgroundColor: "rgba(100, 100, 100, 0.2" }}>
      This is custom Paragraph block!! with props &nbsp;{JSON.stringify(props, null, 2)}
    </code>
  )
})
