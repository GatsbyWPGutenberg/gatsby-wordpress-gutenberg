import React from "react"
import { graphql } from "gatsby"

import Block from "../../components/block"

export const query = graphql`
  fragment UnknownBlock on WpBlock {
    ...Block
    saveContent
  }
`

export default function UnknownBlock(props) {
  const { saveContent } = props

  return (
    <Block {...props}>
      <div dangerouslySetInnerHTML={{ __html: saveContent }} />
    </Block>
  )
}
