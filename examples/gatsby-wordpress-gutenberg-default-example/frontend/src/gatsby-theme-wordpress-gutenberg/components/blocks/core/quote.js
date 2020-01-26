import React from "react"
import { graphql } from "gatsby"

export const query = graphql`
  fragment Quote on CoreQuoteGutenbergBlock {
    attributes {
      value
      className
    }
  }
`

export default props => (
  <>
    <p style={{ background: `orange` }}>
      <strong>This is a custom implementation of quote block with props</strong>
      <p>{JSON.stringify(props)}</p>
    </p>
  </>
)
