import React from "react"
import { graphql } from "gatsby"

export const query = graphql`
  fragment CoreHeading on WP_CoreHeadingBlock {
    attributes {
      className
      content
      level
    }
  }
`

export default React.memo(props => {
  const { attributes } = props

  if (!attributes) {
    return null
  }

  return JSON.stringify(attributes)
})
