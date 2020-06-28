import React from "react"
import { graphql } from "gatsby"

import Block from "../../../../components/block"

import "@rmwc/tooltip/styles"

export const query = graphql`
  fragment Paragraph on WpCoreParagraphBlock {
    ...Block
    attributes {
      ... on WpCoreParagraphBlockAttributes {
        content
        dropCap
        customBackgroundColor
      }
    }
  }
`

export default function Paragraph(props) {
  const { attributes } = props

  return (
    <Block {...props}>
      <p
        style={{
          backgroundColor: attributes.customBackgroundColor || `aliceblue`,
          border: `3px solid rebeccapurple`,
          borderRadius: `5px`,
          padding: 5,
        }}
        dangerouslySetInnerHTML={{ __html: attributes.content }}
      />
    </Block>
  )
}
