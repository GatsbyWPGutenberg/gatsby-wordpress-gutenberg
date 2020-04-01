import React from "react"
import { graphql } from "gatsby"

export const query = graphql`
  fragment HelloWorld on Query {
    wpPost(databaseId: { eq: $postId }) {
      modifiedGmt
      slug
    }
  }
`

export default ({ data, pageContext, children }) => (
  <>
    <pre>This is post with hello-world permalink, it also has fragment on Query</pre>
    <pre>{JSON.stringify({ data, pageContext }, null, 2)}</pre>
    <h2>and the blocks are</h2>
    {children}
  </>
)
