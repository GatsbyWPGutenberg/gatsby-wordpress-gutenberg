import React from "react"
import { graphql } from "gatsby"

export const query = graphql`
  fragment Quote on WpCoreQuoteBlock {
    attributes {
      ... on WpCoreQuoteBlockAttributes {
        value
        className
      }
    }
  }
`
export default (props) => (
  <>
    <p style={{ backgroundColor: `blue` }}>{props.value}</p>
  </>
)
