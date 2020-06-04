import React from "react"
import { graphql } from "gatsby"

export const fragment = graphql`
  fragment Paragraph on WpCoreParagraphBlock {
    attributes {
      ... on WpCoreParagraphBlockAttributes {
        content
      }
    }
  }
`

export default (props) => {
  return <p>{props.attributes.content} of Pa</p>
}
